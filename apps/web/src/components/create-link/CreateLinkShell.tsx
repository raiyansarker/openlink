import type { ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Text } from '@astryxdesign/core/Text'
import { useMediaQuery } from '@astryxdesign/core/hooks'
import {
  DASHBOARD_CONTENT_PANEL_BG,
  DASHBOARD_CONTENT_PANEL_BORDER,
  DASHBOARD_CONTENT_PANEL_RADIUS,
  DASHBOARD_CONTENT_PANEL_SHADOW,
  DASHBOARD_SURFACE_BG,
  SHELL_NAV_TEXT_PRIMARY,
} from '#/components/dashboard/layout/dashboard-shell-colors'
import { useShortcut } from '#/hooks/use-shortcut'

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
  /** Shown centered in the nav bar on stacked (narrow) widths. */
  title?: string
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
  title,
  main,
  aside,
  asideFooter,
}: CreateLinkShellProps) {
  const hasAside = aside != null
  // Below the split's breakpoint the form stacks under a nav bar with the
  // title in it, and the primary actions pin to the viewport bottom instead
  // of living under the preview (see `.ol-create-navbar` / `.ol-create-footer`).
  const isStacked = useMediaQuery('(max-width: 959px)')

  const navigate = useNavigate()

  // Escape goes back, even from a field; open menus/dialogs get it first.
  useShortcut('Escape', () => void navigate({ to: backTo, search: backSearch }))

  const backLink = (
    <Link
      to={backTo}
      search={backSearch}
      className="ol-focus-ring"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px 4px 6px',
        marginLeft: -6,
        // Room and rounded corners, so the focus ring isn't a tight box on the text.
        borderRadius: 'var(--radius-element)',
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
  )

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
              className="ol-create-aside-pad settings-content-scroll"
              style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '28px 28px 16px' }}
            >
              <div style={{ maxWidth: ASIDE_CONTENT_MAX_WIDTH, margin: '0 auto' }}>
                {aside}
              </div>
            </div>
            {asideFooter && !isStacked ? (
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
        {/* Back link: pinned above the scrolling form, always visible.
            Stacked widths restyle it (via CSS) into a modal nav bar with the
            title centered — back on the left, hairline + blur underneath. */}
        <div
          className="ol-create-navbar"
          style={{
            flexShrink: 0,
            padding: '16px 32px 12px',
            backgroundColor: DASHBOARD_SURFACE_BG,
          }}
        >
          {isStacked && title ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                width: '100%',
              }}
            >
              {backLink}
              <Text weight="semibold">{title}</Text>
              <span aria-hidden style={{ justifySelf: 'end' }} />
            </div>
          ) : (
            backLink
          )}
        </div>
        <div
          className="settings-content-scroll"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            // Scroll anchoring off: with it, opening "More options" while
            // scrolled down kept the BOTTOM of the page pinned and expanded
            // the new sections above the viewport. The expected motion is the
            // opposite — the tapped trigger stays put and the revealed
            // content pushes what's below it DOWN out of the way.
            overflowAnchor: 'none',
          }}
        >
          <div className="ol-create-form-pad" style={{ padding: '8px 32px 48px' }}>
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

      {/* Stacked widths: the primary actions pin to the viewport bottom —
          the sheet-style CTA — instead of living under the preview. */}
      {isStacked && asideFooter ? (
        <div className="ol-create-footer" style={{ flexShrink: 0 }}>
          {asideFooter}
        </div>
      ) : null}
    </div>
  )
}
