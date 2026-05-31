import React, { useCallback, useEffect, useState } from 'react'
import type { Medication, MedicationInput } from '../../../shared/types'
import { TIMING_RULE_LABELS } from '../../../shared/constants'
import { api } from '../hooks/useApi'
import TypeBadge from '../components/TypeBadge'
import Modal from '../components/Modal'
import MedicationForm from '../components/MedicationForm'
import { Plus, Pencil, ArchiveX, RotateCcw, PauseCircle, PlayCircle } from 'lucide-react'

type ModalState = { mode: 'add' } | { mode: 'edit'; med: Medication } | null

export default function MedicationsView(): JSX.Element {
  const [meds, setMeds] = useState<Medication[]>([])
  const [showInactive, setShowInactive] = useState(false)
  const [modal, setModal] = useState<ModalState>(null)

  const load = useCallback(async () => {
    const all = await api.meds.list()
    setMeds(all)
  }, [])

  useEffect(() => { load() }, [load])

  const handleSubmit = async (data: MedicationInput): Promise<void> => {
    if (modal?.mode === 'edit') {
      await api.meds.update(modal.med.id, data)
    } else {
      await api.meds.create(data)
    }
    setModal(null)
    load()
  }

  const handleArchive = async (id: number): Promise<void> => {
    await api.meds.archive(id)
    load()
  }

  const handleReactivate = async (id: number): Promise<void> => {
    await api.meds.reactivate(id)
    load()
  }

  const handlePause = async (id: number): Promise<void> => {
    await api.meds.pause(id)
    load()
  }

  const handleUnpause = async (id: number): Promise<void> => {
    await api.meds.unpause(id)
    load()
  }

  const visible = showInactive ? meds : meds.filter((m) => m.active)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '28px 32px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 24 }}>Medications</h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Show archived
            </label>
            <button
              onClick={() => setModal({ mode: 'add' })}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--accent)',
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none'
              }}
            >
              <Plus size={15} />
              Add medication
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 32px 32px' }}>
        {visible.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 60 }}>
            No medications found.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                {['Name', 'Type', 'Dose', 'Per day', 'Timing', 'End date', ''].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((med) => (
                <tr
                  key={med.id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    opacity: med.active ? (med.paused ? 0.7 : 1) : 0.5,
                    background: 'transparent',
                    transition: 'background 0.1s'
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--surface-alt)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                >
                  <td style={{ padding: '11px 12px', fontWeight: 600, fontSize: 14 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {med.name}
                      {med.active === 1 && med.paused === 1 && (
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--warning-light, #fff3cd)',
                          color: 'var(--warning, #856404)',
                          border: '1px solid var(--warning-border, #ffc107)'
                        }}>Paused</span>
                      )}
                    </span>
                  </td>
                  <td style={{ padding: '11px 12px' }}><TypeBadge type={med.type} /></td>
                  <td style={{ padding: '11px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
                    {med.dose_amount} {med.dose_unit}{med.dose_amount > 1 ? 's' : ''}
                  </td>
                  <td style={{ padding: '11px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
                    {med.doses_per_day}×/day
                  </td>
                  <td style={{ padding: '11px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
                    {TIMING_RULE_LABELS[med.timing_rule]}
                  </td>
                  <td style={{ padding: '11px 12px', color: 'var(--text-muted)', fontSize: 13 }}>
                    {med.end_date ?? '—'}
                  </td>
                  <td style={{ padding: '11px 12px' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <IconBtn
                        icon={<Pencil size={14} />}
                        title="Edit"
                        onClick={() => setModal({ mode: 'edit', med })}
                      />
                      {med.active === 1 && (
                        med.paused === 1 ? (
                          <IconBtn
                            icon={<PlayCircle size={14} />}
                            title="Unpause"
                            onClick={() => handleUnpause(med.id)}
                          />
                        ) : (
                          <IconBtn
                            icon={<PauseCircle size={14} />}
                            title="Pause"
                            onClick={() => handlePause(med.id)}
                          />
                        )
                      )}
                      {med.active ? (
                        <IconBtn
                          icon={<ArchiveX size={14} />}
                          title="Archive"
                          onClick={() => handleArchive(med.id)}
                          danger
                        />
                      ) : (
                        <IconBtn
                          icon={<RotateCcw size={14} />}
                          title="Reactivate"
                          onClick={() => handleReactivate(med.id)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal
          title={modal.mode === 'add' ? 'Add medication' : `Edit — ${(modal as { mode: 'edit'; med: Medication }).med.name}`}
          onClose={() => setModal(null)}
          width={560}
        >
          <MedicationForm
            initial={modal.mode === 'edit' ? modal.med : undefined}
            onSubmit={handleSubmit}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  )
}

function IconBtn({
  icon,
  title,
  onClick,
  danger
}: {
  icon: React.ReactNode
  title: string
  onClick: () => void
  danger?: boolean
}): JSX.Element {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        padding: '5px 7px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border)',
        background: 'transparent',
        color: danger ? 'var(--danger)' : 'var(--text-muted)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        transition: 'background 0.15s, color 0.15s'
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = danger ? 'var(--danger-light)' : 'var(--surface-alt)'
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
      }}
    >
      {icon}
    </button>
  )
}
