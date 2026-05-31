import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { TodayData, DoseGroup, DoseEntry, Meal, MealTime } from '../../../shared/types'
import { api } from '../hooks/useApi'
import { MEAL_LABELS } from '../../../shared/constants'
import ProgressBar from '../components/ProgressBar'
import TypeBadge from '../components/TypeBadge'
import BigCheckbox from '../components/BigCheckbox'
import WarningChip from '../components/WarningChip'

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-AU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

function formatTakenAt(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function PencilIcon(): JSX.Element {
  return (
    <svg
      width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function UndoIcon(): JSX.Element {
  return (
    <svg
      width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-4" />
    </svg>
  )
}

// ── Shared time-edit sub-components ──────────────────────────────────────────

function TimeEditControls({
  value,
  inputRef,
  onChange,
  onSave,
  onCancel,
  onKeyDown
}: {
  value: string
  inputRef: React.RefObject<HTMLInputElement>
  onChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
}): JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input
        ref={inputRef}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 600,
          fontSize: 15,
          padding: '3px 8px',
          borderRadius: 'var(--radius-sm)',
          border: '1.5px solid var(--accent)',
          background: 'var(--surface)',
          color: 'var(--text)',
          outline: 'none',
          cursor: 'text'
        }}
      />
      <button
        onClick={onSave}
        title="Save"
        style={{
          padding: '4px 10px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--accent)',
          background: 'var(--accent)',
          color: '#fff',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        Save
      </button>
      <button
        onClick={onCancel}
        title="Cancel"
        style={{
          padding: '4px 8px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          background: 'transparent',
          color: 'var(--text-muted)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        Cancel
      </button>
    </div>
  )
}

function TimeDisplayButton({
  time,
  isOverridden,
  hovering,
  onMouseEnter,
  onMouseLeave,
  onClick,
  colorOverride
}: {
  time: string
  isOverridden: boolean
  hovering: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  onClick: () => void
  colorOverride?: string
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      title="Edit time"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        fontFamily: 'var(--font-heading)',
        fontWeight: 600,
        fontSize: 15,
        color: colorOverride ?? (isOverridden ? 'var(--accent)' : 'var(--text)'),
        background: hovering ? 'var(--accent-light)' : 'transparent',
        border: '1px solid',
        borderColor: hovering ? 'var(--accent)' : 'transparent',
        borderRadius: 'var(--radius-sm)',
        padding: '3px 7px',
        cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s',
        lineHeight: 1
      }}
    >
      {formatTime12(time)}
      <span style={{
        opacity: hovering ? 1 : isOverridden ? 0.6 : 0,
        transition: 'opacity 0.15s',
        color: 'var(--accent)',
        display: 'flex',
        alignItems: 'center'
      }}>
        <PencilIcon />
      </span>
    </button>
  )
}

function RevertButton({ onClick }: { onClick: () => void }): JSX.Element {
  return (
    <button
      onClick={onClick}
      title="Revert to scheduled time"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--text-muted)',
        padding: '3px 7px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border)',
        cursor: 'pointer',
        background: 'transparent',
        transition: 'background 0.15s, color 0.15s'
      }}
      onMouseEnter={(e) => {
        const b = e.currentTarget
        b.style.background = 'var(--surface-alt)'
        b.style.color = 'var(--text)'
      }}
      onMouseLeave={(e) => {
        const b = e.currentTarget
        b.style.background = 'transparent'
        b.style.color = 'var(--text-muted)'
      }}
    >
      <UndoIcon />
      Revert
    </button>
  )
}

// ── DoseRow ───────────────────────────────────────────────────────────────────

function DoseRow({
  entry,
  onToggle,
  readOnly
}: {
  entry: DoseEntry
  onToggle: (id: number, taken: boolean) => void
  readOnly?: boolean
}): JSX.Element {
  const taken = Boolean(entry.taken_at)
  const isWarning = entry.timing_rule === 'after_food_no_eat_30'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        borderRadius: 'var(--radius-sm)',
        background: taken ? 'var(--surface-alt)' : 'transparent',
        transition: 'background 0.2s',
        opacity: taken ? 0.75 : 1
      }}
    >
      <BigCheckbox
        checked={taken}
        onChange={(v) => onToggle(entry.id, v)}
        disabled={readOnly}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontWeight: 600,
              fontSize: 14,
              textDecoration: taken ? 'line-through' : 'none',
              color: taken ? 'var(--text-muted)' : 'var(--text)'
            }}
          >
            {entry.name}
          </span>
          <TypeBadge type={entry.type} />
          {isWarning && !taken && (
            <WarningChip message="No eating for 30 min after" />
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 2 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {entry.dose_amount} {entry.dose_unit}
            {entry.dose_amount > 1 ? 's' : ''}
            {entry.notes ? ` · ${entry.notes}` : ''}
          </span>
          {taken && entry.taken_at && (
            <span style={{ fontSize: 12, color: 'var(--success)' }}>
              Taken at {formatTakenAt(entry.taken_at)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── DoseGroupCard ─────────────────────────────────────────────────────────────

function DoseGroupCard({
  group,
  onToggle,
  onMarkAll,
  onSetGroupTime,
  readOnly
}: {
  group: DoseGroup
  onToggle: (id: number, taken: boolean) => void
  onMarkAll: (ids: number[], taken: boolean) => void
  onSetGroupTime: (ids: number[], time: string | null) => void
  readOnly?: boolean
}): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(group.time)
  const [hoveringTime, setHoveringTime] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const ids = group.entries.map((e) => e.id)
  const anyUntaken = group.entries.some((e) => !e.taken_at)

  function startEdit(): void {
    setEditValue(group.time)
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function saveEdit(): void {
    setEditing(false)
    if (editValue && editValue !== group.time) {
      onSetGroupTime(ids, editValue)
    }
  }

  function cancelEdit(): void {
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Enter') saveEdit()
    if (e.key === 'Escape') cancelEdit()
  }

  const untakenRed = !group.allTaken && !readOnly
  return (
    <div
      style={{
        background: group.allTaken ? 'var(--surface)' : untakenRed ? 'rgba(220, 38, 38, 0.05)' : 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        border: `1px solid ${group.allTaken ? 'var(--border)' : untakenRed ? 'rgba(220, 38, 38, 0.2)' : 'var(--border)'}`,
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        marginBottom: 16
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: `1px solid ${group.allTaken ? 'var(--border)' : untakenRed ? 'rgba(220, 38, 38, 0.2)' : 'var(--border)'}`,
          background: group.allTaken ? 'var(--success-light)' : untakenRed ? 'rgba(220, 38, 38, 0.1)' : 'var(--surface-alt)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          {!readOnly && editing ? (
            <TimeEditControls
              value={editValue}
              inputRef={inputRef}
              onChange={setEditValue}
              onSave={saveEdit}
              onCancel={cancelEdit}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TimeDisplayButton
                time={group.time}
                isOverridden={group.hasTimeOverride}
                hovering={!readOnly && hoveringTime}
                onMouseEnter={() => { if (!readOnly) setHoveringTime(true) }}
                onMouseLeave={() => setHoveringTime(false)}
                onClick={() => { if (!readOnly) startEdit() }}
                colorOverride={group.allTaken ? 'var(--success)' : group.hasTimeOverride ? 'var(--accent)' : undefined}
              />
              {!readOnly && group.hasTimeOverride && (
                <RevertButton onClick={() => onSetGroupTime(ids, null)} />
              )}
            </div>
          )}
          {(readOnly || !editing) && (
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              — {group.label}
            </span>
          )}
        </div>

        {!readOnly && anyUntaken && !editing && (
          <button
            onClick={() => onMarkAll(ids, true)}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--accent)',
              padding: '5px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--accent)',
              cursor: 'pointer',
              background: 'transparent',
              transition: 'background 0.15s',
              flexShrink: 0
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-light)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            Mark all taken
          </button>
        )}
      </div>

      <div style={{ padding: '8px 0' }}>
        {group.entries.map((entry) => (
          <DoseRow key={entry.id} entry={entry} onToggle={onToggle} readOnly={readOnly} />
        ))}
      </div>
    </div>
  )
}

// ── MealCard ──────────────────────────────────────────────────────────────────

interface MealTimeItem {
  meal: Meal
  label: string
  time: string
  isOverridden: boolean
  defaultTime: string
}

function MealCard({
  item,
  onSetTime,
  onRevert
}: {
  item: MealTimeItem
  onSetTime: (meal: Meal, time: string) => void
  onRevert: (meal: Meal) => void
}): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(item.time)
  const [hoveringTime, setHoveringTime] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit(): void {
    setEditValue(item.time)
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function saveEdit(): void {
    setEditing(false)
    if (editValue && editValue !== item.time) {
      onSetTime(item.meal, editValue)
    }
  }

  function cancelEdit(): void {
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Enter') saveEdit()
    if (e.key === 'Escape') cancelEdit()
  }

  return (
    <div
      style={{
        background: 'rgba(245, 158, 11, 0.05)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        marginBottom: 16
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '14px 16px',
          background: 'rgba(245, 158, 11, 0.1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          {editing ? (
            <TimeEditControls
              value={editValue}
              inputRef={inputRef}
              onChange={setEditValue}
              onSave={saveEdit}
              onCancel={cancelEdit}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TimeDisplayButton
                time={item.time}
                isOverridden={item.isOverridden}
                hovering={hoveringTime}
                onMouseEnter={() => setHoveringTime(true)}
                onMouseLeave={() => setHoveringTime(false)}
                onClick={startEdit}
              />
              {item.isOverridden && (
                <RevertButton onClick={() => onRevert(item.meal)} />
              )}
            </div>
          )}
          {!editing && (
            <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>
              — {item.label}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── CurrentTimeDivider ────────────────────────────────────────────────────────

function CurrentTimeDivider(): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        margin: '4px 0 20px'
      }}
    >
      <div style={{ flex: 1, borderTop: '2px dashed #4a90d9' }} />
      <span style={{ fontSize: 11, fontWeight: 600, color: '#4a90d9', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
        NOW
      </span>
      <div style={{ flex: 1, borderTop: '2px dashed #4a90d9' }} />
    </div>
  )
}

// ── Timeline types ────────────────────────────────────────────────────────────

type TimelineEntry =
  | { kind: 'dose'; group: DoseGroup }
  | { kind: 'meal'; item: MealTimeItem }

function entryTime(e: TimelineEntry): string {
  return e.kind === 'dose' ? e.group.time : e.item.time
}

// ── TodayView ─────────────────────────────────────────────────────────────────

function getDateStrings(): { todayStr: string; tomorrowStr: string } {
  const base = new Date()
  const todayStr = base.toISOString().slice(0, 10)
  const tomorrow = new Date(base)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().slice(0, 10)
  return { todayStr, tomorrowStr }
}

export default function TodayView(): JSX.Element {
  const [data, setData] = useState<TodayData | null>(null)
  const [mealTimes, setMealTimes] = useState<MealTime[]>([])
  const [mealOverrides, setMealOverrides] = useState<Partial<Record<Meal, string>>>({})
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => new Date())
  const [viewingTomorrow, setViewingTomorrow] = useState(false)

  const load = useCallback(async () => {
    const { todayStr, tomorrowStr } = getDateStrings()
    const viewStr = viewingTomorrow ? tomorrowStr : todayStr
    const [result, times] = await Promise.all([api.today.get(viewStr), api.mealTimes.list()])
    setData(result)
    setMealTimes(times)
    const overrides: Partial<Record<Meal, string>> = {}
    for (const { meal } of times) {
      const val = localStorage.getItem(`pillpal_meal_override_${viewStr}_${meal}`)
      if (val) overrides[meal] = val
    }
    setMealOverrides(overrides)
    setLoading(false)
  }, [viewingTomorrow])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(tick)
  }, [])

  const handleToggle = useCallback(
    async (id: number, taken: boolean) => {
      await api.dose.toggle(id, taken)
      load()
    },
    [load]
  )

  const handleMarkAll = useCallback(
    async (ids: number[], taken: boolean) => {
      await api.dose.markGroup(ids, taken)
      load()
    },
    [load]
  )

  const handleSetGroupTime = useCallback(
    async (ids: number[], time: string | null) => {
      await api.dose.setGroupTime(ids, time)
      load()
    },
    [load]
  )

  const handleSetMealTime = useCallback(async (meal: Meal, time: string) => {
    const { todayStr, tomorrowStr } = getDateStrings()
    const viewStr = viewingTomorrow ? tomorrowStr : todayStr
    localStorage.setItem(`pillpal_meal_override_${viewStr}_${meal}`, time)
    setMealOverrides((prev) => ({ ...prev, [meal]: time }))
    await api.mealTimes.setDayOverride(viewStr, meal, time)
    load()
  }, [load, viewingTomorrow])

  const handleRevertMealTime = useCallback(async (meal: Meal) => {
    const { todayStr, tomorrowStr } = getDateStrings()
    const viewStr = viewingTomorrow ? tomorrowStr : todayStr
    localStorage.removeItem(`pillpal_meal_override_${viewStr}_${meal}`)
    setMealOverrides((prev) => {
      const next = { ...prev }
      delete next[meal]
      return next
    })
    await api.mealTimes.setDayOverride(viewStr, meal, null)
    load()
  }, [load, viewingTomorrow])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)' }}>
        Loading…
      </div>
    )
  }

  const todayDate = new Date()
  const tomorrowDate = new Date(todayDate)
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const displayDate = viewingTomorrow ? tomorrowDate : todayDate
  const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const currentTimeDisplay = now.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })
  const overduePills = viewingTomorrow ? 0 : (data?.groups
    .filter((g) => g.time < currentHHMM && !g.allTaken)
    .flatMap((g) => g.entries.filter((e) => !e.taken_at))
    .length ?? 0)

  const groups = data?.groups ?? []

  const mealItems: MealTimeItem[] = mealTimes.map(({ meal, time: defaultTime }) => ({
    meal,
    label: MEAL_LABELS[meal],
    time: mealOverrides[meal] ?? defaultTime,
    isOverridden: Boolean(mealOverrides[meal]),
    defaultTime
  }))

  const timeline: TimelineEntry[] = [
    ...groups.map((group): TimelineEntry => ({ kind: 'dose', group })),
    ...mealItems.map((item): TimelineEntry => ({ kind: 'meal', item }))
  ].sort((a, b) => entryTime(a).localeCompare(entryTime(b)))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          padding: '28px 32px 20px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <h1 style={{ fontSize: 26, marginBottom: 4 }}>
            {viewingTomorrow && (
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)', display: 'block', marginBottom: 2 }}>
                Tomorrow's schedule
              </span>
            )}
            {formatDate(displayDate)}
          </h1>
          <button
            onClick={() => {
              setViewingTomorrow((v) => !v)
              setLoading(true)
            }}
            style={{
              marginTop: 4,
              flexShrink: 0,
              fontSize: 13,
              fontWeight: 600,
              color: viewingTomorrow ? 'var(--text)' : 'var(--accent)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${viewingTomorrow ? 'var(--border)' : 'var(--accent)'}`,
              cursor: 'pointer',
              background: 'transparent',
              transition: 'background 0.15s, border-color 0.15s'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = viewingTomorrow ? 'var(--surface-alt)' : 'var(--accent-light)'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            }}
          >
            {viewingTomorrow ? '← Back to today' : "Check tomorrow's schedule"}
          </button>
        </div>
        {!viewingTomorrow && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 16 }}>
            <span>Current time: {currentTimeDisplay}</span>
            <span style={{ color: overduePills > 0 ? 'var(--error, #dc2626)' : 'var(--text-muted)' }}>
              Overdue: {overduePills}
            </span>
          </div>
        )}
        {data && (
          <div style={{ marginTop: 16 }}>
            <ProgressBar taken={data.taken} total={data.total} />
          </div>
        )}
      </div>

      {/* Scrollable timeline */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px 32px' }}>
        {groups.length === 0 && mealItems.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--text-muted)',
              marginTop: 60,
              fontSize: 15
            }}
          >
            No doses scheduled for {viewingTomorrow ? 'tomorrow' : 'today'}.
            <br />
            <span style={{ fontSize: 13 }}>Add medications in the Medications tab.</span>
          </div>
        )}
        {!viewingTomorrow && timeline.length > 0 && entryTime(timeline[0]) > currentHHMM && <CurrentTimeDivider />}
        {timeline.map((entry, i) => {
          const time = entryTime(entry)
          const nextTime = i < timeline.length - 1 ? entryTime(timeline[i + 1]) : null
          const isLastPast = !viewingTomorrow && time <= currentHHMM && nextTime !== null && nextTime > currentHHMM

          if (entry.kind === 'dose') {
            return (
              <React.Fragment key={`dose-${entry.group.time}-${entry.group.label}`}>
                <DoseGroupCard
                  group={entry.group}
                  onToggle={handleToggle}
                  onMarkAll={handleMarkAll}
                  onSetGroupTime={handleSetGroupTime}
                  readOnly={viewingTomorrow}
                />
                {isLastPast && <CurrentTimeDivider />}
              </React.Fragment>
            )
          }

          return (
            <React.Fragment key={`meal-${entry.item.meal}`}>
              <MealCard
                item={entry.item}
                onSetTime={handleSetMealTime}
                onRevert={handleRevertMealTime}
              />
              {isLastPast && <CurrentTimeDivider />}
            </React.Fragment>
          )
        })}
        {!viewingTomorrow && timeline.length > 0 && entryTime(timeline[timeline.length - 1]) <= currentHHMM && <CurrentTimeDivider />}
      </div>
    </div>
  )
}
