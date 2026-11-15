import { createFileRoute, notFound, Outlet } from '@tanstack/react-router'
import ThreeColumnDashboardLayout from '#/components/dashboard/layout/ThreeColumnDashboardLayout'
import { isValidOrganizationSlug } from '#/lib/organization/slugify'
import { OrganizationProvider, useOrganization } from '#/contexts/OrganizationContext'
import type { ReactNode } from 'react'

export const Route = createFileRoute('/dashboard/$orgSlug')({
  // Whether the user belongs to this workspace is decided once the list loads (see OrganizationProvider).
  beforeLoad: ({ params }) => {
    if (!isValidOrganizationSlug(params.orgSlug)) throw notFound()
  },
  component: OrgDashboardLayout,
})

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

function OrgDashboardLayout() {
  const { orgSlug } = Route.useParams()

  return (
    <OrganizationProvider orgSlugFromRoute={orgSlug}>
      <DashboardChrome>
        <Outlet />
      </DashboardChrome>
    </OrganizationProvider>
  )
}
