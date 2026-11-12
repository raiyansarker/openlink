import { createFileRoute } from '@tanstack/react-router'
import DashboardMembersPanel from '#/components/dashboard/DashboardMembersPanel'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/dashboard/$orgSlug/members')({
  head: createPageHead('Members'),
  component: DashboardMembersPage,
})

function DashboardMembersPage() {
  return <DashboardMembersPanel />
}
