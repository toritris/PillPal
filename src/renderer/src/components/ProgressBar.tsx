import React from 'react'

interface Props {
  taken: number
  total: number
}

export default function ProgressBar({ taken, total }: Props): JSX.Element {
  const pct = total === 0 ? 0 : Math.round((taken / total) * 100)
  const allDone = total > 0 && taken === total

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 8
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {taken} of {total} doses taken today
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: allDone ? 'var(--success)' : 'var(--text-muted)'
          }}
        >
          {allDone ? 'All done!' : `${pct}%`}
        </span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 3,
          background: 'var(--surface-alt)',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 3,
            background: allDone ? 'var(--success)' : 'var(--accent)',
            transition: 'width 0.4s ease'
          }}
        />
      </div>
    </div>
  )
}
