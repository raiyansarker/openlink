import { useState, type CSSProperties } from 'react'
const CREATE_LINK_HEIGHT = 34

function ShortcutChip({ children }: { children: string }) {
  return (
    <span
      style={{
        fontSize: 10,
        color: 'rgba(0, 0, 0, 0.45)',
        fontWeight: 500,
        letterSpacing: '0.04em',
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
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
        border: '1px solid rgba(0, 0, 0, 0.12)',
        borderRadius: 9,
        cursor: 'pointer',
        backgroundColor: hovered ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
        color: '#0a0a0a',
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
