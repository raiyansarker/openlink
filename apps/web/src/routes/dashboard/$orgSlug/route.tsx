import {
  createFileRoute,
  notFound,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { OrganizationProvider } from '#/contexts/OrganizationContext'
import ThreeColumnDashboardLayout from '#/components/dashboard/layout/ThreeColumnDashboardLayout'
import { getOrganizationById, isValidOrgSlug } from '#/data/demo/queries'
import { persistActiveOrgSlug } from '#/lib/dashboard/org-slug'
import { useOrganization } from '#/contexts/OrganizationContext'
import type { ReactNode } from 'react'

export const Route = createFileRoute('/dashboard/$orgSlug')({
  beforeLoad: ({ params }) => {
    if (isValidOrgSlug(params.orgSlug)) {
      persistActiveOrgSlug(params.orgSlug)
      return
    }

    const legacyOrg = getOrganizationById(params.orgSlug)
    if (legacyOrg) {
      throw redirect({
        to: '/dashboard/$orgSlug',
        params: { orgSlug: legacyOrg.slug },
        replace: true,
      })
    }

    throw notFound()
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
