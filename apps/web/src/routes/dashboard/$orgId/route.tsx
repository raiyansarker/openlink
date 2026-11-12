import { createFileRoute, notFound, Outlet } from '@tanstack/react-router'
import DashboardShell from '#/components/DashboardShell'
import { isValidOrgId } from '#/data/demo/queries'

const STORAGE_KEY = 'openlink.active-org'

export const Route = createFileRoute('/dashboard/$orgId')({
  beforeLoad: ({ params }) => {
    if (!isValidOrgId(params.orgId)) {
      throw notFound()
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, params.orgId)
    }
  },
  component: OrgDashboardLayout,
})

function OrgDashboardLayout() {
  const { orgId } = Route.useParams()
  return (
    <DashboardShell orgIdFromRoute={orgId}>
      <Outlet />
    </DashboardShell>
  )
}
