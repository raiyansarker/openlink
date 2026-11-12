import type { ReactNode } from 'react'
import type { Organization } from '#/data/demo/types'
import OrganizationIconRail from './OrganizationIconRail'
import DashboardNavColumn from './DashboardNavColumn'

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
      {/* Column 1 — darkest icon rail */}
      <OrganizationIconRail
        organizations={organizations}
        activeOrgSlug={activeOrgSlug}
      />

      {/* Column 2 — dark nav */}
      <DashboardNavColumn />

      {/* Column 3 — white content area with rounded inset */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          height: '100%',
          padding: 10,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            backgroundColor: '#ffffff',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.08)',
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
