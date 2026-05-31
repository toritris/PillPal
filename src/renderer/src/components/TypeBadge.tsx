import React from 'react'
import type { MedType } from '../../../shared/types'

interface Props {
  type: MedType
}

export default function TypeBadge({ type }: Props): JSX.Element {
  const isMed = type === 'medicine'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.3px',
        textTransform: 'uppercase',
        background: isMed ? 'var(--badge-medicine-bg)' : 'var(--badge-supplement-bg)',
        color: isMed ? 'var(--badge-medicine-text)' : 'var(--badge-supplement-text)'
      }}
    >
      {isMed ? 'Rx' : 'Supp'}
    </span>
  )
}
