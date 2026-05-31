import { getDb, dbQuery, saveDb, dbOne } from './db'
import type { Medication, MealTime, DoseGroup, DoseEntry, TimingRule, Meal, AppSettings } from '../shared/types'
import { MEALS_ORDER, ANYTIME_SLOTS, MEAL_LABELS, WAKING_TIME, BEDTIME } from '../shared/constants'

interface DoseSpec {
  scheduled_time: string
  slot_label: string
}

export function addMinutes(hhmm: string, delta: number): string {
  const [h, m] = hhmm.split(':').map(Number)
  const total = h * 60 + m + delta
  const clipped = Math.max(0, Math.min(23 * 60 + 59, total))
  return `${String(Math.floor(clipped / 60)).padStart(2, '0')}:${String(clipped % 60).padStart(2, '0')}`
}

function mealsFor(n: number): Meal[] {
  if (n <= 1) return ['breakfast']
  if (n === 2) return ['breakfast', 'dinner']
  return ['breakfast', 'lunch', 'dinner']
}

function anytimeSlots(n: number, favouredTime: string | null): string[] {
  if (!favouredTime) {
    return ANYTIME_SLOTS[Math.min(n, 3)] ?? ANYTIME_SLOTS[3]
  }
  if (n === 1) return [favouredTime]
  const [h, m] = favouredTime.split(':').map(Number)
  const startMins = h * 60 + m
  // Spread doses across 12 hours starting from the favoured time
  const spanMins = 12 * 60
  const step = n > 1 ? Math.floor(spanMins / (n - 1)) : 0
  return Array.from({ length: n }, (_, i) => {
    const total = Math.min(startMins + i * step, 23 * 60 + 59)
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
  })
}

export function computeDoseEntries(
  med: Medication,
  mealTimes: Record<Meal, string>,
  favouredAnytimeTime: string | null = null,
  wakeTime: string | null = null,
  bedTime: string | null = null
): DoseSpec[] {
  const n = med.doses_per_day
  const rule = med.timing_rule

  if (rule === 'upon_waking') {
    const t = wakeTime ?? WAKING_TIME
    return Array.from({ length: n }, () => ({ scheduled_time: t, slot_label: 'Upon waking' }))
  }

  if (rule === 'before_bed') {
    const t = bedTime ?? BEDTIME
    return Array.from({ length: n }, () => ({ scheduled_time: t, slot_label: 'Before bed' }))
  }

  if (rule === 'any_time') {
    if (favouredAnytimeTime) {
      return anytimeSlots(n, favouredAnytimeTime).map((t) => ({
        scheduled_time: t,
        slot_label: 'Anytime'
      }))
    }
    if (n > 3) {
      const start = 8 * 60, end = 20 * 60
      const step = Math.floor((end - start) / (n - 1))
      return Array.from({ length: n }, (_, i) => {
        const mins = start + i * step
        return {
          scheduled_time: `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`,
          slot_label: 'Anytime'
        }
      })
    }
    return (ANYTIME_SLOTS[Math.min(n, 3)] ?? ANYTIME_SLOTS[3]).map((t) => ({
      scheduled_time: t,
      slot_label: 'Anytime'
    }))
  }

  const mins = med.timing_minutes ?? 0
  return mealsFor(n).map((meal) => {
    const base = mealTimes[meal]
    const mealLabel = MEAL_LABELS[meal]
    switch (rule) {
      case 'before_food': return { scheduled_time: addMinutes(base, -mins), slot_label: `Before ${mealLabel}` }
      case 'after_food': return { scheduled_time: addMinutes(base, mins), slot_label: `After ${mealLabel}` }
      case 'with_food': return { scheduled_time: base, slot_label: `With ${mealLabel}` }
      default: return { scheduled_time: base, slot_label: mealLabel }
    }
  })
}

export function ensureScheduleForDate(date: string): void {
  const db = getDb()
  const meds = dbQuery<Medication>(
    `SELECT * FROM medications WHERE active = 1 AND paused = 0 AND (end_date IS NULL OR end_date >= ?) AND (start_date IS NULL OR start_date <= ?)`,
    [date, date]
  )
  const mealRows = dbQuery<MealTime>('SELECT * FROM meal_times')
  const mealTimes = Object.fromEntries(mealRows.map((r) => [r.meal, r.time])) as Record<Meal, string>
  const settings = dbOne<AppSettings>('SELECT favoured_anytime_time, wake_time, bed_time FROM app_settings WHERE id = 1')
  const favouredAnytimeTime = settings?.favoured_anytime_time ?? null
  const wakeTime = settings?.wake_time ?? null
  const bedTime = settings?.bed_time ?? null

  type DesiredRow = { medication_id: number; scheduled_time: string; slot_label: string; timing_rule: TimingRule; timing_minutes: number | null }
  const desired: DesiredRow[] = []

  for (const med of meds) {
    for (const spec of computeDoseEntries(med, mealTimes, favouredAnytimeTime, wakeTime, bedTime)) {
      desired.push({
        medication_id: med.id,
        scheduled_time: spec.scheduled_time,
        slot_label: spec.slot_label,
        timing_rule: med.timing_rule,
        timing_minutes: med.timing_minutes
      })
    }
  }

  // Group desired times per medication for SQL-level deletion
  const desiredTimesByMed = new Map<number, string[]>()
  for (const d of desired) {
    if (!desiredTimesByMed.has(d.medication_id)) desiredTimesByMed.set(d.medication_id, [])
    desiredTimesByMed.get(d.medication_id)!.push(d.scheduled_time)
  }

  db.run('BEGIN')

  // Delete untaken rows at times no longer desired (uses SQL IS NULL, not JS null check)
  for (const med of meds) {
    const times = desiredTimesByMed.get(med.id) ?? []
    if (times.length > 0) {
      const ph = times.map(() => '?').join(', ')
      db.run(
        `DELETE FROM dose_log WHERE medication_id = ? AND scheduled_date = ? AND scheduled_time NOT IN (${ph})`,
        [med.id, date, ...times]
      )
    } else {
      db.run(
        'DELETE FROM dose_log WHERE medication_id = ? AND scheduled_date = ?',
        [med.id, date]
      )
    }
  }

  // Clean up untaken entries for medications no longer active for this date
  if (meds.length > 0) {
    const ph = meds.map(() => '?').join(', ')
    db.run(
      `DELETE FROM dose_log WHERE scheduled_date = ? AND taken_at IS NULL AND medication_id NOT IN (${ph})`,
      [date, ...meds.map((m) => m.id)]
    )
  } else {
    db.run('DELETE FROM dose_log WHERE scheduled_date = ? AND taken_at IS NULL', [date])
  }

  // Insert desired entries; INSERT OR IGNORE preserves existing taken rows via UNIQUE constraint
  for (const d of desired) {
    db.run(
      `INSERT OR IGNORE INTO dose_log (medication_id, scheduled_date, scheduled_time, slot_label, timing_rule, timing_minutes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [d.medication_id, date, d.scheduled_time, d.slot_label, d.timing_rule, d.timing_minutes ?? null]
    )
  }

  db.run('COMMIT')
  saveDb()
}

export function getDayGrouped(date: string): DoseGroup[] {
  const rows = dbQuery<DoseEntry>(
    `SELECT
       dl.id, dl.medication_id, dl.scheduled_time, dl.user_time_override, dl.slot_label, dl.timing_rule, dl.timing_minutes, dl.taken_at,
       m.name, m.type, m.dose_amount, m.dose_unit, m.notes
     FROM dose_log dl
     JOIN medications m ON m.id = dl.medication_id
     WHERE dl.scheduled_date = ?
     ORDER BY COALESCE(dl.user_time_override, dl.scheduled_time) ASC, m.name ASC`,
    [date]
  )

  const groupMap = new Map<string, DoseGroup>()
  for (const row of rows) {
    const effectiveTime = row.user_time_override ?? row.scheduled_time
    if (!groupMap.has(effectiveTime)) {
      groupMap.set(effectiveTime, {
        time: effectiveTime,
        label: row.slot_label,
        entries: [],
        allTaken: true,
        hasTimeOverride: false
      })
    }
    const g = groupMap.get(effectiveTime)!
    g.entries.push(row)
    if (!row.taken_at) g.allTaken = false
    if (row.user_time_override) g.hasTimeOverride = true
  }

  return Array.from(groupMap.values()).sort((a, b) => a.time.localeCompare(b.time))
}
