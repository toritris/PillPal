import React, { useCallback, useEffect, useState } from 'react'
import type { Meal, MealTime } from '../../../shared/types'
import { MEAL_LABELS, MEALS_ORDER } from '../../../shared/constants'
import { api } from '../hooks/useApi'
import { Check } from 'lucide-react'

export default function SettingsView(): JSX.Element {
  const [mealTimes, setMealTimes] = useState<Record<Meal, string>>({
    breakfast: '08:00',
    lunch: '13:00',
    dinner: '19:00'
  })
  const [saved, setSaved] = useState<Meal | null>(null)
  const [loading, setLoading] = useState(true)

  const [favouredTime, setFavouredTime] = useState<string>('')
  const [favouredSaved, setFavouredSaved] = useState(false)

  const [wakeTime, setWakeTime] = useState<string>('')
  const [wakeSaved, setWakeSaved] = useState(false)
  const [bedTime, setBedTime] = useState<string>('')
  const [bedSaved, setBedSaved] = useState(false)

  const load = useCallback(async () => {
    const [rows, settings] = await Promise.all([api.mealTimes.list(), api.settings.get()])
    const map = Object.fromEntries(rows.map((r: MealTime) => [r.meal, r.time])) as Record<Meal, string>
    setMealTimes((prev) => ({ ...prev, ...map }))
    setFavouredTime(settings.favoured_anytime_time ?? '')
    setWakeTime(settings.wake_time ?? '')
    setBedTime(settings.bed_time ?? '')
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleChange = (meal: Meal, time: string): void => {
    setMealTimes((prev) => ({ ...prev, [meal]: time }))
  }

  const handleSave = async (meal: Meal): Promise<void> => {
    await api.mealTimes.update(meal, mealTimes[meal])
    setSaved(meal)
    setTimeout(() => setSaved(null), 1800)
  }

  const handleFavouredSave = async (): Promise<void> => {
    await api.settings.update({ favoured_anytime_time: favouredTime || null })
    setFavouredSaved(true)
    setTimeout(() => setFavouredSaved(false), 1800)
  }

  const handleWakeSave = async (): Promise<void> => {
    await api.settings.update({ wake_time: wakeTime || null })
    setWakeSaved(true)
    setTimeout(() => setWakeSaved(false), 1800)
  }

  const handleBedSave = async (): Promise<void> => {
    await api.settings.update({ bed_time: bedTime || null })
    setBedSaved(true)
    setTimeout(() => setBedSaved(false), 1800)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <h1 style={{ fontSize: 24 }}>Settings</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <section
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
            padding: '24px',
            maxWidth: 440
          }}
        >
          <h2 style={{ fontSize: 16, marginBottom: 4 }}>Meal times</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            These times drive your entire medication schedule. Changes take effect immediately.
          </p>

          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {MEALS_ORDER.map((meal) => (
                <div key={meal} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <label
                    style={{
                      width: 90,
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text)'
                    }}
                  >
                    {MEAL_LABELS[meal]}
                  </label>
                  <input
                    type="time"
                    value={mealTimes[meal]}
                    onChange={(e) => handleChange(meal, e.target.value)}
                    style={{
                      padding: '7px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      fontSize: 14,
                      color: 'var(--text)',
                      background: 'var(--surface)',
                      outline: 'none',
                      width: 130
                    }}
                  />
                  <button
                    onClick={() => handleSave(meal)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: saved === meal ? 'var(--success)' : 'var(--accent)',
                      color: 'white',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                  >
                    {saved === meal ? <><Check size={13} /> Saved</> : 'Save'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
            padding: '24px',
            maxWidth: 440,
            marginTop: 20
          }}
        >
          <h2 style={{ fontSize: 16, marginBottom: 4 }}>Anytime medications</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            Medications set to "Any time" will be scheduled at this time by default. Leave blank to use the built-in defaults.
          </p>
          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ width: 90, fontSize: 14, fontWeight: 600, color: 'var(--text)', flexShrink: 0 }}>
                Favoured time
              </label>
              <input
                type="time"
                value={favouredTime}
                onChange={(e) => setFavouredTime(e.target.value)}
                style={{
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  fontSize: 14,
                  color: 'var(--text)',
                  background: 'var(--surface)',
                  outline: 'none',
                  width: 130
                }}
              />
              <button
                onClick={handleFavouredSave}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: favouredSaved ? 'var(--success)' : 'var(--accent)',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                {favouredSaved ? <><Check size={13} /> Saved</> : 'Save'}
              </button>
            </div>
          )}
        </section>

        <section
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
            padding: '24px',
            maxWidth: 440,
            marginTop: 20
          }}
        >
          <h2 style={{ fontSize: 16, marginBottom: 4 }}>Wake &amp; bed times</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            Medications set to "Upon waking" or "Before bed" will be scheduled at these times. Leave blank to use the built-in defaults.
          </p>
          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Wake time', value: wakeTime, onChange: setWakeTime, saved: wakeSaved, onSave: handleWakeSave },
                { label: 'Bed time', value: bedTime, onChange: setBedTime, saved: bedSaved, onSave: handleBedSave }
              ].map(({ label, value, onChange, saved, onSave }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <label style={{ width: 90, fontSize: 14, fontWeight: 600, color: 'var(--text)', flexShrink: 0 }}>
                    {label}
                  </label>
                  <input
                    type="time"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    style={{
                      padding: '7px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      fontSize: 14,
                      color: 'var(--text)',
                      background: 'var(--surface)',
                      outline: 'none',
                      width: 130
                    }}
                  />
                  <button
                    onClick={onSave}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: saved ? 'var(--success)' : 'var(--accent)',
                      color: 'white',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                  >
                    {saved ? <><Check size={13} /> Saved</> : 'Save'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
            padding: '24px',
            maxWidth: 440,
            marginTop: 20
          }}
        >
          <h2 style={{ fontSize: 16, marginBottom: 4 }}>Reminders</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Desktop notifications fire automatically at each scheduled dose time while PillPal is running.
            No configuration needed.
          </p>
        </section>
      </div>
    </div>
  )
}
