import React from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  message: string
}

export default function WarningChip({ message }: Props): JSX.Element {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 8px',
        borderRadius: 99,
        background: 'var(--warning-light)',
        color: 'var(--warning)',
        fontSize: 11,
        fontWeight: 600
      }}
    >
      <AlertTriangle size={11} />
      {message}
    </span>
  )
}
