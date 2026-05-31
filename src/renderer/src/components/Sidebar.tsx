import React from 'react'
import { CalendarDays, Pill, Settings, History } from 'lucide-react'
import type { View } from '../App'

interface Props {
  activeView: View
  onNavigate: (v: View) => void
}

const items: { id: View; label: string; Icon: React.FC<{ size?: number }> }[] = [
  { id: 'today', label: 'Today', Icon: CalendarDays },
  { id: 'medications', label: 'Medications', Icon: Pill },
  { id: 'history', label: 'History', Icon: History },
  { id: 'settings', label: 'Settings', Icon: Settings }
]

export default function Sidebar({ activeView, onNavigate }: Props): JSX.Element {
  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 12px',
        gap: 4,
        flexShrink: 0
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 20,
          fontWeight: 600,
          color: 'var(--accent)',
          padding: '0 12px',
          marginBottom: 28,
          letterSpacing: '-0.3px'
        }}
      >
        PillPal
      </div>

      {items.map(({ id, label, Icon }) => {
        const active = activeView === id
        return (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              background: active ? 'var(--accent-light)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--text-muted)',
              fontWeight: active ? 600 : 400,
              fontSize: 14,
              transition: 'background 0.15s, color 0.15s',
              textAlign: 'left',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              if (!active) {
                ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-alt)'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
              }
            }}
          >
            <Icon size={16} />
            {label}
          </button>
        )
      })}
    </aside>
  )
}
