import type { ReactNode } from 'react'
import type { Organization } from '#/data/demo/types'
import OrganizationIconRail from './OrganizationIconRail'
import DashboardNavColumn from './DashboardNavColumn'
import { DASHBOARD_PANEL_BACKGROUND } from './dashboard-shell-colors'

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
        backgroundColor: '#0a0a0a',
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
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: DASHBOARD_PANEL_BACKGROUND,
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            backgroundColor: '#ffffff',
            borderRadius: 14,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
