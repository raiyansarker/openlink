import { createFileRoute, notFound, Outlet } from '@tanstack/react-router'
import DashboardShell from '#/components/DashboardShell'
import { isValidOrgSlug } from '#/data/demo/queries'
import { persistActiveOrgSlug } from '#/lib/dashboard/org-slug'

export const Route = createFileRoute('/dashboard/$orgSlug')({
  beforeLoad: ({ params }) => {
    if (!isValidOrgSlug(params.orgSlug)) {
      throw notFound()
    }
    persistActiveOrgSlug(params.orgSlug)
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
