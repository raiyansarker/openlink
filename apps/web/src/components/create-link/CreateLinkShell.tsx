import type { ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  DASHBOARD_CONTENT_PANEL_BG,
  DASHBOARD_CONTENT_PANEL_BORDER,
  DASHBOARD_CONTENT_PANEL_RADIUS,
  DASHBOARD_CONTENT_PANEL_SHADOW,
  DASHBOARD_SURFACE_BG,
  SHELL_NAV_TEXT_PRIMARY,
} from '#/components/dashboard/layout/dashboard-shell-colors'
import { useKeyPress } from '#/hooks/use-key-press'

/** Same language as Settings: raised panel + plain canvas column, 50/50. */
const MAIN_WIDTH = '50%'
const MAIN_CONTENT_MAX_WIDTH = 640
const ASIDE_CONTENT_MAX_WIDTH = 520

type CreateLinkShellProps = {
  /** Where "back" goes (the Links page, in the folder we came from). */
  backTo: string
  backSearch?: Record<string, string | undefined>
  /** Text of the back link (defaults to "Links"). */
  backLabel?: string
  /** Form (right, on the canvas). */
  main: ReactNode
  /** Preview (left, raised panel). Omit to let `main` span the page. */
  aside?: ReactNode
  /** Pinned at the bottom of the preview panel (primary actions). */
  asideFooter?: ReactNode
}

function ChevronBackIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.35}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10 3.5 5.5 8 10 12.5" />
    </svg>
  )
}

/**
 * Full-viewport split for creating a link, matching the Settings shell:
 * the preview lives in a raised, independently scrolling panel on the
 * left; the form scrolls on the canvas to its right.
 * Stacks below 960px (see `.ol-create-split` in styles.css).
 */
export default function CreateLinkShell({
  backTo,
  backSearch,
  backLabel = 'Links',
  main,
  aside,
  asideFooter,
}: CreateLinkShellProps) {
  const hasAside = aside != null

  const navigate = useNavigate()

  // Escape goes back, even from a field; open menus/dialogs get it first.
  useKeyPress('Escape', () => void navigate({ to: backTo, search: backSearch }), {
    allowInInputs: true,
  })

  return (
    <div
      className="ol-create-split"
      style={{
        display: 'flex',
        width: '100%',
        height: '100dvh',
        overflow: 'hidden',
        backgroundColor: DASHBOARD_SURFACE_BG,
      }}
    >
      {/* Preview — raised panel (left) */}
      {hasAside ? (
        <aside
          className="ol-create-split-aside"
          aria-label="Link preview"
          style={{
            flex: '0 0 50%',
            width: '50%',
            minWidth: 0,
            height: '100%',
            padding: 10,
            paddingRight: 0,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              backgroundColor: DASHBOARD_CONTENT_PANEL_BG,
              borderRadius: DASHBOARD_CONTENT_PANEL_RADIUS,
              border: DASHBOARD_CONTENT_PANEL_BORDER,
              boxShadow: DASHBOARD_CONTENT_PANEL_SHADOW,
            }}
          >
            <div
              className="settings-content-scroll"
              style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '28px 28px 16px' }}
            >
              <div style={{ maxWidth: ASIDE_CONTENT_MAX_WIDTH, margin: '0 auto' }}>
                {aside}
              </div>
            </div>
            {asideFooter ? (
              <div
                style={{
                  flexShrink: 0,
                  padding: '16px 28px 20px',
                }}
              >
                <div style={{ maxWidth: ASIDE_CONTENT_MAX_WIDTH, margin: '0 auto' }}>
                  {asideFooter}
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      ) : null}
      {/* Form — on the canvas (right) */}
      <div
        className="ol-create-split-main"
        style={{
          flex: '1 1 auto',
          width: hasAside ? MAIN_WIDTH : '100%',
          minWidth: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Back link: pinned above the scrolling form, always visible */}
        <div
          style={{
            flexShrink: 0,
            padding: '16px 32px 12px',
            backgroundColor: DASHBOARD_SURFACE_BG,
          }}
        >
          <Link
            to={backTo}
            search={backSearch}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '2px 0',
              color: SHELL_NAV_TEXT_PRIMARY,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'inherit',
              letterSpacing: '-0.01em',
              textDecoration: 'none',
            }}
          >
            <ChevronBackIcon />
            {backLabel}
          </Link>
        </div>
        <div
          className="settings-content-scroll"
          style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}
        >
          <div style={{ padding: '8px 32px 48px' }}>
            <div
              style={{
                width: '100%',
                maxWidth: MAIN_CONTENT_MAX_WIDTH,
                margin: '0 auto',
              }}
            >
              {main}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
