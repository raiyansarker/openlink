import { OrganizationProvider, useOrganization } from '#/contexts/OrganizationContext'
import ThreeColumnDashboardLayout from '#/components/dashboard/layout/ThreeColumnDashboardLayout'
import type { ReactNode } from 'react'

type DashboardShellProps = {
  orgSlugFromRoute: string
  children: ReactNode
}

export default function DashboardShell({
  orgSlugFromRoute,
  children,
}: DashboardShellProps) {
  return (
    <OrganizationProvider orgSlugFromRoute={orgSlugFromRoute}>
      <DashboardChrome>{children}</DashboardChrome>
    </OrganizationProvider>
  )
}

function DashboardChrome({ children }: { children: ReactNode }) {
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
