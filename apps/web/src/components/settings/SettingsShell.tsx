import type { ReactNode } from 'react'
import SettingsNavColumn from './SettingsNavColumn'

const SETTINGS_SURFACE_BG = '#f7f7f7'
const SETTINGS_PANEL_BG = '#ffffff'

const NAV_SLOT_WIDTH = '35%'
const CONTENT_PANEL_RADIUS = 9
const CONTENT_MAX_WIDTH = '100%'
const CONTENT_PANEL_BORDER = '1px solid rgba(0, 0, 0, 0.055)'

type SettingsShellProps = {
  children: ReactNode
}

export default function SettingsShell({ children }: SettingsShellProps) {
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100dvh',
        overflow: 'hidden',
        backgroundColor: SETTINGS_SURFACE_BG,
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
          backgroundColor: SETTINGS_SURFACE_BG,
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
          backgroundColor: SETTINGS_SURFACE_BG,
        }}
      >
        <div
          className="settings-content-scroll"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            backgroundColor: SETTINGS_PANEL_BG,
            borderRadius: CONTENT_PANEL_RADIUS,
            border: CONTENT_PANEL_BORDER,
            boxShadow: 'none',
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
