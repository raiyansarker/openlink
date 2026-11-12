import { createFileRoute, notFound, Outlet, redirect } from '@tanstack/react-router'
import DashboardShell from '#/components/DashboardShell'
import { getOrganizationById, isValidOrgSlug } from '#/data/demo/queries'
import { persistActiveOrgSlug } from '#/lib/dashboard/org-slug'

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

function OrgDashboardLayout() {
  const { orgSlug } = Route.useParams()
  return (
    <DashboardShell orgSlugFromRoute={orgSlug}>
      <Outlet />
    </DashboardShell>
  )
}
