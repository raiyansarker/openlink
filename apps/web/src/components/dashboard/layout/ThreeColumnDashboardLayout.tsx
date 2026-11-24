import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useMediaQuery } from '@astryxdesign/core/hooks'
import { releaseShellPaintHold } from '#/lib/dashboard/shell-paint-hold'
import type { Workspace } from '#/lib/api/types'
import OrganizationIconRail from './OrganizationIconRail'
import DashboardNavColumn from './DashboardNavColumn'
import MobileDashboardShell from './MobileDashboardShell'
import {
  DASHBOARD_CONTENT_PANEL_BG,
  DASHBOARD_CONTENT_PANEL_BORDER,
  DASHBOARD_CONTENT_PANEL_RADIUS,
  DASHBOARD_CONTENT_PANEL_SHADOW,
  DASHBOARD_SURFACE_BG,
} from './dashboard-shell-colors'

type ThreeColumnDashboardLayoutProps = {
  organizations: Workspace[]
  activeOrgSlug: string
  children: ReactNode
}

/**
 * Responsive contract:
 *   ≥ 768px: three regions — org rail | nav column | content.
 *   < 768px: the app shell — workspace pill + bottom tabs + create FAB
 *            (MobileDashboardShell), swapped in by useMediaQuery here.
 */
const IS_PHONE = '(max-width: 767px)'

export default function ThreeColumnDashboardLayout({
  organizations,
  activeOrgSlug,
  children,
}: ThreeColumnDashboardLayoutProps) {
  const isPhone = useMediaQuery(IS_PHONE)

  // Portraits-on-reload: the SSR'd desktop tree hydrates first, then this
  // watch swaps trees. The head script holds the shell's paint across that
  // gap (see shell-paint-hold.ts); the hold lifts HERE — but only once the
  // PHONE tree has committed. An unguarded lift would release while the
  // desktop tree is still on-screen, right before the swap — the flash
  // again, one hook later.
  useEffect(() => {
    if (isPhone) releaseShellPaintHold()
  }, [isPhone])

  if (isPhone) {
    return (
      <MobileDashboardShell organizations={organizations} activeOrgSlug={activeOrgSlug}>
        {children}
      </MobileDashboardShell>
    )
  }

  return (
    <div
      data-dashboard-shell="desktop"
      style={{
        display: 'flex',
        flexDirection: isPhone ? 'column' : 'row',
        width: '100%',
        height: '100dvh',
        overflow: 'hidden',
        backgroundColor: DASHBOARD_SURFACE_BG,
      }}
    >
      <OrganizationIconRail organizations={organizations} activeOrgSlug={activeOrgSlug} />
      <DashboardNavColumn />

      <div
        style={{
          flex: 1,
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
          {children}
        </div>
      </div>
    </div>
  )
}
