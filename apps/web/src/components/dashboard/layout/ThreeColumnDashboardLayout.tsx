import type { ReactNode } from 'react'
import type { Organization } from '#/data/demo/types'
import OrganizationIconRail from './OrganizationIconRail'
import DashboardNavColumn from './DashboardNavColumn'
import {
  DASHBOARD_CONTENT_PANEL_BG,
  DASHBOARD_CONTENT_PANEL_BORDER,
  DASHBOARD_CONTENT_PANEL_RADIUS,
  DASHBOARD_SURFACE_BG,
} from './dashboard-shell-colors'

type ThreeColumnDashboardLayoutProps = {
  organizations: Organization[]
  activeOrgSlug: string
  children: ReactNode
}

export default function ThreeColumnDashboardLayout({
  organizations,
  activeOrgSlug,
  children,
}: ThreeColumnDashboardLayoutProps) {
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
      <OrganizationIconRail
        organizations={organizations}
        activeOrgSlug={activeOrgSlug}
      />

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
            boxShadow: 'none',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
