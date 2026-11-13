import { useState, type CSSProperties } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useOrganization } from '#/contexts/OrganizationContext'
import { useKeyPress } from '#/hooks/use-key-press'
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
  /** Overrides the default action (open /create/link for the active org). */
  onClick?: () => void
  /** Folder to pre-select on the create page. */
  folderId?: string | null
  /**
   * Listen for the "C" shortcut. Enable on one instance only (the nav column)
   * so the shortcut doesn't fire twice.
   */
  hasShortcut?: boolean
}

export default function CreateLinkChromeButton({
  layout = 'hug',
  onClick,
  folderId,
  hasShortcut = false,
}: CreateLinkChromeButtonProps) {
  const [hovered, setHovered] = useState(false)
  const navigate = useNavigate()
  const { activeOrg } = useOrganization()
  // On the Links page, default to the folder being viewed (sidebar button and
  // the "C" shortcut don't get a folderId of their own).
  const viewingFolder = useRouterState({
    select: (state) => {
      if (!/\/links\/?$/.test(state.location.pathname)) return undefined
      const folder = (state.location.search as { folder?: unknown }).folder
      return typeof folder === 'string' ? folder : undefined
    },
  })

  const open = () => {
    if (onClick) {
      onClick()
      return
    }
    void navigate({
      to: '/create/link',
      search: { org: activeOrg.slug, folder: folderId ?? viewingFolder },
    })
  }

  useKeyPress('c', open, { isEnabled: hasShortcut })

  const widthStyle: CSSProperties =
    layout === 'fill' ? { width: '100%' } : { width: 'auto' }

  return (
    <button
      type="button"
      onClick={open}
      aria-keyshortcuts={hasShortcut ? 'C' : undefined}
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

export { CREATE_LINK_HEIGHT, ShortcutChip }
