import React, { useCallback } from 'react'

interface Props {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}

export default function BigCheckbox({ checked, onChange, disabled }: Props): JSX.Element {
  const handleClick = useCallback(() => {
    if (!disabled) onChange(!checked)
  }, [checked, disabled, onChange])

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      aria-checked={checked}
      role="checkbox"
      style={{
        width: 26,
        height: 26,
        borderRadius: 6,
        border: checked ? '2px solid var(--accent)' : '2px solid var(--border-strong)',
        background: checked ? 'var(--accent)' : 'var(--surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer',
        transition: 'background 0.2s, border-color 0.2s, transform 0.15s',
        transform: checked ? 'scale(1.05)' : 'scale(1)',
        flexShrink: 0,
        outline: 'none'
      }}
      onMouseEnter={(e) => {
        if (!disabled && !checked) {
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !checked) {
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)'
        }
      }}
    >
      {checked && (
        <svg
          width="14"
          height="10"
          viewBox="0 0 14 10"
          fill="none"
          style={{
            animation: 'checkDraw 0.2s ease forwards'
          }}
        >
          <style>{`
            @keyframes checkDraw {
              from { stroke-dashoffset: 20; opacity: 0; }
              to { stroke-dashoffset: 0; opacity: 1; }
            }
          `}</style>
          <polyline
            points="1.5,5 5.5,9 12.5,1"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="20"
            strokeDashoffset="0"
          />
        </svg>
      )}
    </button>
  )
}
