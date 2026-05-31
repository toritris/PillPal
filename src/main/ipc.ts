import { ipcMain } from 'electron'
import { dbQuery, dbOne, dbRun, dbLastId, dbTransaction, getDb, saveDb } from './db'
import { ensureScheduleForDate, getDayGrouped, addMinutes } from './schedule'
import { IPC, MEAL_LABELS } from '../shared/constants'
import type { Meal, TimingRule, MedicationInput, TodayData, DaySummary, DoseEntry, AppSettings } from '../shared/types'
import { rescheduleReminders } from './notifications'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function nowIso(): string {
  return new Date().toISOString()
}

export function registerIpc(): void {
  // ── Medications ──────────────────────────────────────────────────
  ipcMain.handle(IPC.MEDS_LIST, (_e, activeOnly?: boolean) => {
    if (activeOnly) {
      return dbQuery('SELECT * FROM medications WHERE active = 1 ORDER BY name ASC')
    }
    return dbQuery('SELECT * FROM medications ORDER BY active DESC, name ASC')
  })

  ipcMain.handle(IPC.MEDS_CREATE, (_e, med: MedicationInput) => {
    const db = getDb()
    db.run(
      `INSERT INTO medications (name, type, dose_amount, dose_unit, doses_per_day, timing_rule, timing_minutes, notes, start_date, end_date, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [med.name, med.type, med.dose_amount, med.dose_unit, med.doses_per_day, med.timing_rule, med.timing_minutes ?? null, med.notes ?? null, med.start_date ?? null, med.end_date ?? null]
    )
    const id = dbLastId()
    saveDb()
    const created = dbOne('SELECT * FROM medications WHERE id = ?', [id])
    ensureScheduleForDate(today())
    rescheduleReminders()
    return created
  })

  ipcMain.handle(IPC.MEDS_UPDATE, (_e, id: number, med: Partial<MedicationInput>) => {
    const db = getDb()
    const entries = Object.entries(med).filter(([, v]) => v !== undefined)
    const sets = entries.map(([k]) => `${k} = ?`).join(', ')
    const vals = [...entries.map(([, v]) => v), id]
    db.run(`UPDATE medications SET ${sets} WHERE id = ?`, vals as never[])
    saveDb()
    const updated = dbOne('SELECT * FROM medications WHERE id = ?', [id])
    ensureScheduleForDate(today())
    rescheduleReminders()
    return updated
  })

  ipcMain.handle(IPC.MEDS_ARCHIVE, (_e, id: number) => {
    const db = getDb()
    db.run('UPDATE medications SET active = 0 WHERE id = ?', [id])
    db.run('DELETE FROM dose_log WHERE medication_id = ? AND scheduled_date = ? AND taken_at IS NULL', [id, today()])
    saveDb()
    rescheduleReminders()
  })

  ipcMain.handle(IPC.MEDS_REACTIVATE, (_e, id: number) => {
    getDb().run('UPDATE medications SET active = 1 WHERE id = ?', [id])
    saveDb()
    ensureScheduleForDate(today())
    rescheduleReminders()
  })

  ipcMain.handle(IPC.MEDS_PAUSE, (_e, id: number) => {
    const db = getDb()
    db.run('UPDATE medications SET paused = 1 WHERE id = ?', [id])
    db.run('DELETE FROM dose_log WHERE medication_id = ? AND scheduled_date = ? AND taken_at IS NULL', [id, today()])
    saveDb()
    rescheduleReminders()
  })

  ipcMain.handle(IPC.MEDS_UNPAUSE, (_e, id: number) => {
    getDb().run('UPDATE medications SET paused = 0 WHERE id = ?', [id])
    saveDb()
    ensureScheduleForDate(today())
    rescheduleReminders()
  })

  // ── Meal times ────────────────────────────────────────────────────
  ipcMain.handle(IPC.MEAL_TIMES_LIST, () => {
    return dbQuery('SELECT * FROM meal_times ORDER BY id ASC')
  })

  ipcMain.handle(IPC.MEAL_TIMES_SET_DAY_OVERRIDE, (_e, date: string, meal: Meal, newTime: string | null) => {
    const label = MEAL_LABELS[meal]
    const db = getDb()
    if (newTime === null) {
      db.run(
        `UPDATE dose_log SET user_time_override = NULL WHERE scheduled_date = ? AND slot_label LIKE ?`,
        [date, `%${label}%`]
      )
    } else {
      const rows = dbQuery<{ id: number; timing_rule: TimingRule; timing_minutes: number | null }>(
        `SELECT id, timing_rule, timing_minutes FROM dose_log WHERE scheduled_date = ? AND slot_label LIKE ?`,
        [date, `%${label}%`]
      )
      db.run('BEGIN')
      for (const row of rows) {
        const mins = row.timing_minutes ?? 0
        let override: string
        switch (row.timing_rule) {
          case 'before_food': override = addMinutes(newTime, -mins); break
          case 'after_food': override = addMinutes(newTime, mins); break
          default: override = newTime
        }
        db.run('UPDATE dose_log SET user_time_override = ? WHERE id = ?', [override, row.id])
      }
      db.run('COMMIT')
    }
    saveDb()
    rescheduleReminders()
  })

  ipcMain.handle(IPC.MEAL_TIMES_UPDATE, (_e, meal: Meal, time: string) => {
    getDb().run('UPDATE meal_times SET time = ? WHERE meal = ?', [time, meal])
    saveDb()
    ensureScheduleForDate(today())
    rescheduleReminders()
  })

  // ── App settings ─────────────────────────────────────────────────
  ipcMain.handle(IPC.SETTINGS_GET, () => {
    return dbOne<AppSettings>('SELECT favoured_anytime_time, wake_time, bed_time FROM app_settings WHERE id = 1') ?? { favoured_anytime_time: null, wake_time: null, bed_time: null }
  })

  ipcMain.handle(IPC.SETTINGS_UPDATE, (_e, patch: Partial<AppSettings>) => {
    const entries = Object.entries(patch).filter(([, v]) => v !== undefined)
    if (entries.length === 0) return
    const sets = entries.map(([k]) => `${k} = ?`).join(', ')
    const vals = entries.map(([, v]) => v)
    getDb().run(`UPDATE app_settings SET ${sets} WHERE id = 1`, vals as never[])
    saveDb()
    ensureScheduleForDate(today())
    rescheduleReminders()
  })

  // ── Today ─────────────────────────────────────────────────────────
  ipcMain.handle(IPC.TODAY_GET, (_e, date?: string) => {
    const d = date ?? today()
    ensureScheduleForDate(d)
    const groups = getDayGrouped(d)
    const total = groups.reduce((s, g) => s + g.entries.length, 0)
    const taken = groups.reduce((s, g) => s + g.entries.filter((e) => e.taken_at).length, 0)
    return { groups, taken, total } satisfies TodayData
  })

  // ── Dose toggles ──────────────────────────────────────────────────
  ipcMain.handle(IPC.DOSE_TOGGLE, (_e, id: number, taken: boolean) => {
    if (taken) {
      dbRun('UPDATE dose_log SET taken_at = ? WHERE id = ?', [nowIso(), id])
    } else {
      dbRun('UPDATE dose_log SET taken_at = NULL WHERE id = ?', [id])
    }
    rescheduleReminders()
  })

  ipcMain.handle(IPC.DOSE_MARK_GROUP, (_e, ids: number[], taken: boolean) => {
    const db = getDb()
    db.run('BEGIN')
    for (const id of ids) {
      if (taken) {
        db.run('UPDATE dose_log SET taken_at = ? WHERE id = ?', [nowIso(), id])
      } else {
        db.run('UPDATE dose_log SET taken_at = NULL WHERE id = ?', [id])
      }
    }
    db.run('COMMIT')
    saveDb()
    rescheduleReminders()
  })

  ipcMain.handle(IPC.DOSE_SET_GROUP_TIME, (_e, ids: number[], time: string | null) => {
    const db = getDb()
    db.run('BEGIN')
    for (const id of ids) {
      db.run('UPDATE dose_log SET user_time_override = ? WHERE id = ?', [time, id])
    }
    db.run('COMMIT')
    saveDb()
    rescheduleReminders()
  })

  // ── History ───────────────────────────────────────────────────────
  ipcMain.handle(IPC.HISTORY_GET_MONTH, (_e, year: number, month: number): DaySummary[] => {
    const prefix = `${String(year)}-${String(month).padStart(2, '0')}`
    const rows = dbQuery<{ scheduled_date: string; total: number; taken: number }>(
      `SELECT scheduled_date,
              COUNT(*) as total,
              SUM(CASE WHEN taken_at IS NOT NULL THEN 1 ELSE 0 END) as taken
       FROM dose_log
       WHERE scheduled_date LIKE ?
       GROUP BY scheduled_date`,
      [`${prefix}%`]
    )

    const todayStr = today()
    return rows.map((r) => {
      let status: DaySummary['status']
      if (r.total === 0) status = 'empty'
      else if (r.scheduled_date > todayStr) status = 'future'
      else if (r.taken === r.total) status = 'complete'
      else if (r.taken === 0) status = 'missed'
      else status = 'partial'
      return { date: r.scheduled_date, total: r.total, taken: r.taken, status }
    })
  })

  ipcMain.handle(IPC.HISTORY_GET_DAY, (_e, date: string): DoseEntry[] => {
    return dbQuery<DoseEntry>(
      `SELECT dl.id, dl.medication_id, dl.scheduled_time, dl.slot_label, dl.timing_rule, dl.timing_minutes, dl.taken_at,
              m.name, m.type, m.dose_amount, m.dose_unit, m.notes
       FROM dose_log dl
       JOIN medications m ON m.id = dl.medication_id
       WHERE dl.scheduled_date = ?
       ORDER BY dl.scheduled_time ASC, m.name ASC`,
      [date]
    )
  })

  ipcMain.handle(IPC.HISTORY_STREAK, (): number => {
    const todayStr = today()
    let streak = 0
    const d = new Date()
    for (let i = 0; i < 365; i++) {
      const dateStr = d.toISOString().slice(0, 10)
      if (dateStr > todayStr) { d.setDate(d.getDate() - 1); continue }
      const row = dbOne<{ total: number; taken: number }>(
        `SELECT COUNT(*) as total, SUM(CASE WHEN taken_at IS NOT NULL THEN 1 ELSE 0 END) as taken
         FROM dose_log WHERE scheduled_date = ?`,
        [dateStr]
      )
      if (!row || row.total === 0) break
      if (row.taken < row.total) break
      streak++
      d.setDate(d.getDate() - 1)
    }
    return streak
  })
}
