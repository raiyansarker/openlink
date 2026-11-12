import { useState, type CSSProperties } from 'react'
import {
  SHELL_CHROME_BORDER,
  SHELL_NAV_TEXT_PRIMARY,
  SHELL_NAV_TEXT_SECONDARY,
} from '#/components/dashboard/layout/dashboard-shell-colors'

const CREATE_LINK_HEIGHT = 34

function ShortcutChip({ children }: { children: string }) {
  return (
    <span
      style={{
        fontSize: 10,
        color: SHELL_NAV_TEXT_SECONDARY,
        fontWeight: 500,
        letterSpacing: '0.04em',
        backgroundColor: 'var(--color-overlay-hover)',
        border: '1px solid var(--color-border)',
        borderRadius: 5,
        padding: '2px 5px',
        lineHeight: 1.4,
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  )
}

type CreateLinkChromeButtonProps = {
  /** Full width in the nav column; hug content in page headers. */
  layout?: 'fill' | 'hug'
  onClick?: () => void
}

export default function CreateLinkChromeButton({
  layout = 'hug',
  onClick,
}: CreateLinkChromeButtonProps) {
  const [hovered, setHovered] = useState(false)

  const widthStyle: CSSProperties =
    layout === 'fill' ? { width: '100%' } : { width: 'auto' }

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        height: CREATE_LINK_HEIGHT,
        padding: '0 12px',
        border: SHELL_CHROME_BORDER,
        borderRadius: 9,
        cursor: 'pointer',
        backgroundColor: hovered
          ? 'var(--color-background-surface)'
          : 'var(--color-background-muted)',
        color: SHELL_NAV_TEXT_PRIMARY,
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: '0.01em',
        transition: 'background-color 0.14s ease, border-color 0.14s ease',
        flexShrink: 0,
        boxSizing: 'border-box',
        ...widthStyle,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <span>Create link</span>
      <ShortcutChip>C</ShortcutChip>
    </button>
  )
}

export { CREATE_LINK_HEIGHT }
