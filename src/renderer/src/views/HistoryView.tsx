import React, { useCallback, useEffect, useState } from 'react'
import type { DaySummary, DoseEntry } from '../../../shared/types'
import { api } from '../hooks/useApi'
import TypeBadge from '../components/TypeBadge'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

function dayStatusColor(status: DaySummary['status']): { bg: string; text: string } {
  switch (status) {
    case 'complete': return { bg: 'var(--success)', text: 'white' }
    case 'partial': return { bg: 'var(--warning)', text: 'white' }
    case 'missed': return { bg: 'var(--danger)', text: 'white' }
    case 'future': return { bg: 'var(--surface-alt)', text: 'var(--text-faint)' }
    default: return { bg: 'transparent', text: 'var(--text-faint)' }
  }
}

function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

function formatTakenAt(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function HistoryView(): JSX.Element {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1) // 1-indexed
  const [summaries, setSummaries] = useState<DaySummary[]>([])
  const [streak, setStreak] = useState(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dayEntries, setDayEntries] = useState<DoseEntry[]>([])
  const [loadingDay, setLoadingDay] = useState(false)

  const loadMonth = useCallback(async () => {
    const [data, s] = await Promise.all([
      api.history.getMonth(year, month),
      api.history.streak()
    ])
    setSummaries(data)
    setStreak(s)
  }, [year, month])

  useEffect(() => { loadMonth() }, [loadMonth])

  const handleSelectDay = async (dateStr: string): Promise<void> => {
    setSelectedDate(dateStr)
    setLoadingDay(true)
    const entries = await api.history.getDay(dateStr)
    setDayEntries(entries)
    setLoadingDay(false)
  }

  const prevMonth = (): void => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
    setSelectedDate(null)
  }
  const nextMonth = (): void => {
    const todayMonth = today.getMonth() + 1
    const todayYear = today.getFullYear()
    if (year === todayYear && month === todayMonth) return
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
    setSelectedDate(null)
  }

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const summaryMap = Object.fromEntries(summaries.map((s) => [s.date, s]))
  const todayStr = today.toISOString().slice(0, 10)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '28px 32px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 24 }}>History</h1>
        {streak > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'var(--success-light)', borderRadius: 99 }}>
            <span style={{ fontSize: 18 }}>🔥</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>
              {streak}-day streak
            </span>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px 32px', display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Calendar */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', padding: 20, minWidth: 340, flexShrink: 0 }}>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <button onClick={prevMonth} style={{ padding: 6, borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', background: 'transparent', color: 'var(--text-muted)' }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 15 }}>
              {MONTHS[month - 1]} {year}
            </span>
            <button
              onClick={nextMonth}
              disabled={year === today.getFullYear() && month === today.getMonth() + 1}
              style={{ padding: 6, borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', background: 'transparent', color: 'var(--text-muted)', opacity: (year === today.getFullYear() && month === today.getMonth() + 1) ? 0.35 : 1 }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 6 }}>
            {DAYS.map((d) => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', padding: '2px 0', textTransform: 'uppercase' }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {Array.from({ length: firstDay }, (_, i) => <div key={`blank-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const s = summaryMap[dateStr]
              const status = s ? s.status : (dateStr > todayStr ? 'future' : 'empty')
              const colors = dayStatusColor(status)
              const isSelected = selectedDate === dateStr
              const isToday = dateStr === todayStr
              return (
                <button
                  key={day}
                  onClick={() => status !== 'future' ? handleSelectDay(dateStr) : undefined}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 6,
                    border: isToday ? '2px solid var(--accent)' : isSelected ? '2px solid var(--text-muted)' : '2px solid transparent',
                    background: colors.bg,
                    color: colors.text,
                    fontSize: 13,
                    fontWeight: isToday ? 700 : 400,
                    cursor: status !== 'future' && status !== 'empty' ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'opacity 0.15s',
                    outline: 'none'
                  }}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            {([['complete', 'All taken'], ['partial', 'Partial'], ['missed', 'Missed']] as const).map(([s, label]) => {
              const c = dayStatusColor(s)
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: c.bg }} />
                  {label}
                </div>
              )
            })}
          </div>
        </div>

        {/* Day detail */}
        {selectedDate && (
          <div style={{ flex: 1, background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', padding: 20 }}>
            <h2 style={{ fontSize: 16, marginBottom: 16 }}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h2>
            {loadingDay ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
            ) : dayEntries.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No doses recorded.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dayEntries.map((e) => (
                  <div
                    key={e.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: e.taken_at ? 'var(--success-light)' : 'var(--danger-light)',
                      border: `1px solid ${e.taken_at ? 'var(--border)' : 'var(--danger-light)'}`
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: e.taken_at ? 'var(--success)' : 'var(--danger)',
                        flexShrink: 0
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{e.name}</span>
                      <span style={{ marginLeft: 8 }}><TypeBadge type={e.type} /></span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {formatTime12(e.scheduled_time)} — {e.slot_label}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: e.taken_at ? 'var(--success)' : 'var(--danger)' }}>
                      {e.taken_at ? `Taken ${formatTakenAt(e.taken_at)}` : 'Missed'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
