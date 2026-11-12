import { OrganizationProvider, useOrganization } from '#/contexts/OrganizationContext'
import ThreeColumnDashboardLayout from '#/components/dashboard/layout/ThreeColumnDashboardLayout'
import type { ReactNode } from 'react'

type DashboardShellProps = {
  orgSlugFromRoute: string
  children: ReactNode
}

function DashboardShellInner({ children }: { children: ReactNode }) {
  const { organizations, activeOrg } = useOrganization()
  return (
    <ThreeColumnDashboardLayout
      organizations={organizations}
      activeOrgSlug={activeOrg.slug}
    >
      {children}
    </ThreeColumnDashboardLayout>
  )
}

export default function DashboardShell({
  orgSlugFromRoute,
  children,
}: DashboardShellProps) {
  return (
    <OrganizationProvider orgSlugFromRoute={orgSlugFromRoute}>
      <DashboardShellInner>{children}</DashboardShellInner>
    </OrganizationProvider>
  )
}
