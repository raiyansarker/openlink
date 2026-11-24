import type { ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Text } from '@astryxdesign/core/Text'
import { useIsPhone } from '#/hooks/use-is-phone'
import SettingsNavColumn from './SettingsNavColumn'
import SettingsTabStrip from './SettingsTabStrip'
import {
  DASHBOARD_CONTENT_PANEL_BG,
  DASHBOARD_CONTENT_PANEL_BORDER,
  DASHBOARD_CONTENT_PANEL_RADIUS,
  DASHBOARD_CONTENT_PANEL_SHADOW,
  DASHBOARD_SURFACE_BG,
  SHELL_CHROME_BORDER,
  SHELL_NAV_TEXT_PRIMARY,
} from '#/components/dashboard/layout/dashboard-shell-colors'

const NAV_SLOT_WIDTH = '35%'
const CONTENT_MAX_WIDTH = '100%'

type SettingsShellProps = {
  children: ReactNode
}

/** Chevron leading a back button (points back, to the left in LTR). */
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

export default function SettingsShell({ children }: SettingsShellProps) {
  const isPhone = useIsPhone()
  const navigate = useNavigate()

  // Phones: no nav column — 35% of a phone screen is unreadable. Instead an
  // iOS nav bar — back to the dashboard on the left, "Settings" centered —
  // over a scrollable chip strip of sections, then full-bleed content with
  // Apple's 16px screen margins.
  if (isPhone) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100dvh',
          overflow: 'hidden',
          backgroundColor: DASHBOARD_SURFACE_BG,
        }}
      >
        {/* Modal nav bar, same language as the create-link page */}
        <div
          style={{
            flexShrink: 0,
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            width: '100%',
            minHeight: 56,
            padding: '10px 16px',
            boxSizing: 'border-box',
            borderBottom: SHELL_CHROME_BORDER,
          }}
        >
          <button
            className="ol-focus-ring"
            type="button"
            onClick={() => void navigate({ to: '/w' })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px 4px 6px',
              marginLeft: -6,
              border: 'none',
              borderRadius: 'var(--radius-element)',
              cursor: 'pointer',
              backgroundColor: 'transparent',
              color: SHELL_NAV_TEXT_PRIMARY,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'inherit',
              letterSpacing: '-0.01em',
              justifySelf: 'start',
            }}
          >
            <ChevronBackIcon />
            Dashboard
          </button>
          <Text weight="semibold">Settings</Text>
          <span aria-hidden />
        </div>

        <SettingsTabStrip />

        <div
          className="settings-content-scroll"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            backgroundColor: DASHBOARD_CONTENT_PANEL_BG,
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            // A slim rail for the scrollbar on both sides, so it isn't glued
            // to the content or the screen edge; the inner block compensates
            // to keep the same 16px visual margin.
            paddingInline: 6,
          }}
        >
          <div
            style={{
              paddingTop: 12,
              paddingRight: 10,
              paddingBottom: 40,
              paddingLeft: 10,
              textAlign: 'left',
            }}
          >
            <div style={{ maxWidth: CONTENT_MAX_WIDTH, width: '100%' }}>{children}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100dvh',
        overflow: 'hidden',
        backgroundColor: DASHBOARD_SURFACE_BG,
      }}
    >
      <div
        style={{
          flex: `0 0 ${NAV_SLOT_WIDTH}`,
          width: NAV_SLOT_WIDTH,
          height: '100%',
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'flex-end',
          backgroundColor: DASHBOARD_SURFACE_BG,
        }}
      >
        <SettingsNavColumn />
      </div>
      <div
        style={{
          flex: '1 1 65%',
          minWidth: 0,
          height: '100%',
          padding: 10,
          paddingLeft: 0,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: DASHBOARD_SURFACE_BG,
        }}
      >
        <div
          className="settings-content-scroll"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            backgroundColor: DASHBOARD_CONTENT_PANEL_BG,
            borderRadius: DASHBOARD_CONTENT_PANEL_RADIUS,
            border: DASHBOARD_CONTENT_PANEL_BORDER,
            boxShadow: DASHBOARD_CONTENT_PANEL_SHADOW,
          }}
        >
          <div
            style={{
              paddingTop: 28,
              paddingRight: 36,
              paddingBottom: 36,
              paddingLeft: 32,
              textAlign: 'left',
            }}
          >
            <div style={{ maxWidth: CONTENT_MAX_WIDTH, width: '100%' }}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
