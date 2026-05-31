import React, { useState } from 'react'
import type { Medication, MedicationInput, MedType, TimingRule } from '../../../shared/types'
import { TIMING_RULE_LABELS } from '../../../shared/constants'

interface Props {
  initial?: Medication
  onSubmit: (data: MedicationInput) => void
  onCancel: () => void
}

const TIMING_OPTIONS: TimingRule[] = [
  'before_food', 'after_food', 'with_food', 'any_time', 'upon_waking', 'before_bed'
]

const TIMING_WITH_OFFSET: TimingRule[] = ['before_food', 'after_food']

interface FormState {
  name: string
  type: MedType
  dose_amount: string
  dose_unit: string
  doses_per_day: string
  timing_rule: TimingRule
  timing_minutes: string
  notes: string
  start_date: string
  end_date: string
  active: boolean
}

function fieldStyle(error?: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface)',
    fontSize: 14,
    color: 'var(--text)',
    outline: 'none',
    transition: 'border-color 0.15s'
  }
}

function Label({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
      {children}
    </label>
  )
}

function FieldWrap({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }): JSX.Element {
  return <div style={{ marginBottom: 16, ...style }}>{children}</div>
}

function ErrorMsg({ msg }: { msg?: string }): JSX.Element | null {
  if (!msg) return null
  return <p style={{ marginTop: 4, fontSize: 12, color: 'var(--danger)' }}>{msg}</p>
}

export default function MedicationForm({ initial, onSubmit, onCancel }: Props): JSX.Element {
  const [form, setForm] = useState<FormState>({
    name: initial?.name ?? '',
    type: initial?.type ?? 'supplement',
    dose_amount: String(initial?.dose_amount ?? 1),
    dose_unit: initial?.dose_unit ?? 'tab',
    doses_per_day: String(initial?.doses_per_day ?? 1),
    timing_rule: initial?.timing_rule ?? 'any_time',
    timing_minutes: String(initial?.timing_minutes ?? 30),
    notes: initial?.notes ?? '',
    start_date: initial?.start_date ?? '',
    end_date: initial?.end_date ?? '',
    active: initial ? Boolean(initial.active) : true
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  function set<K extends keyof FormState>(k: K, v: FormState[K]): void {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const needsMinutes = TIMING_WITH_OFFSET.includes(form.timing_rule)

  function validate(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    const da = Number(form.dose_amount)
    if (!Number.isInteger(da) || da < 1) errs.dose_amount = 'Must be at least 1'
    if (!form.dose_unit.trim()) errs.dose_unit = 'Required'
    const dpd = Number(form.doses_per_day)
    if (!Number.isInteger(dpd) || dpd < 1 || dpd > 6) errs.doses_per_day = 'Must be 1–6'
    if (needsMinutes) {
      const tm = Number(form.timing_minutes)
      if (!Number.isInteger(tm) || tm < 1) errs.timing_minutes = 'Must be at least 1'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      name: form.name.trim(),
      type: form.type,
      dose_amount: Number(form.dose_amount),
      dose_unit: form.dose_unit.trim(),
      doses_per_day: Number(form.doses_per_day),
      timing_rule: form.timing_rule,
      timing_minutes: needsMinutes ? Number(form.timing_minutes) : null,
      notes: form.notes.trim() || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      active: form.active ? 1 : 0
    })
  }

  const inputProps = (field: keyof FormState): React.CSSProperties => fieldStyle(Boolean(errors[field]))

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <FieldWrap style={{ gridColumn: '1 / -1' }}>
          <Label>Medication name *</Label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            style={inputProps('name')}
            placeholder="e.g. Vitamin D"
            autoFocus
          />
          <ErrorMsg msg={errors.name} />
        </FieldWrap>

        <FieldWrap>
          <Label>Type *</Label>
          <select
            value={form.type}
            onChange={(e) => set('type', e.target.value as MedType)}
            style={fieldStyle()}
          >
            <option value="supplement">Supplement</option>
            <option value="medicine">Medicine (Rx)</option>
          </select>
        </FieldWrap>

        <FieldWrap>
          <Label>Timing category *</Label>
          <select
            value={form.timing_rule}
            onChange={(e) => set('timing_rule', e.target.value as TimingRule)}
            style={fieldStyle()}
          >
            {TIMING_OPTIONS.map((r) => (
              <option key={r} value={r}>{TIMING_RULE_LABELS[r]}</option>
            ))}
          </select>
          {needsMinutes && (
            <div style={{ marginTop: 8 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                Minutes offset
              </label>
              <input
                type="number"
                min={1}
                value={form.timing_minutes}
                onChange={(e) => set('timing_minutes', e.target.value)}
                style={inputProps('timing_minutes')}
              />
              <ErrorMsg msg={errors.timing_minutes} />
            </div>
          )}
        </FieldWrap>

        <FieldWrap>
          <Label>Dose amount *</Label>
          <input
            type="number"
            min={1}
            value={form.dose_amount}
            onChange={(e) => set('dose_amount', e.target.value)}
            style={inputProps('dose_amount')}
          />
          <ErrorMsg msg={errors.dose_amount} />
        </FieldWrap>

        <FieldWrap>
          <Label>Dose unit *</Label>
          <input
            type="text"
            value={form.dose_unit}
            onChange={(e) => set('dose_unit', e.target.value)}
            style={inputProps('dose_unit')}
            placeholder="tab, capsule, ml…"
          />
          <ErrorMsg msg={errors.dose_unit} />
        </FieldWrap>

        <FieldWrap>
          <Label>Doses per day *</Label>
          <input
            type="number"
            min={1}
            max={6}
            value={form.doses_per_day}
            onChange={(e) => set('doses_per_day', e.target.value)}
            style={inputProps('doses_per_day')}
          />
          <ErrorMsg msg={errors.doses_per_day} />
        </FieldWrap>

        <FieldWrap>
          <Label>Start date (optional)</Label>
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => set('start_date', e.target.value)}
            style={fieldStyle()}
          />
        </FieldWrap>

        <FieldWrap>
          <Label>End date (optional)</Label>
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => set('end_date', e.target.value)}
            style={fieldStyle()}
          />
        </FieldWrap>

        <FieldWrap style={{ gridColumn: '1 / -1' }}>
          <Label>Notes (optional)</Label>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            style={{ ...fieldStyle(), resize: 'vertical', minHeight: 64 }}
            placeholder="Additional instructions…"
          />
        </FieldWrap>

        {initial && (
          <FieldWrap>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => set('active', e.target.checked)}
              />
              Active
            </label>
          </FieldWrap>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '9px 18px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            fontSize: 14,
            color: 'var(--text-muted)',
            cursor: 'pointer',
            background: 'transparent'
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          style={{
            padding: '9px 18px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--accent)',
            color: 'white',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none'
          }}
        >
          {initial ? 'Save changes' : 'Add medication'}
        </button>
      </div>
    </form>
  )
}
