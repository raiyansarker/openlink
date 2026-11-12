import { createFileRoute } from '@tanstack/react-router'
import DashboardSectionPlaceholder from '#/components/dashboard/DashboardSectionPlaceholder'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/dashboard/$orgSlug/members')({
  head: createPageHead('Members'),
  component: DashboardMembersPage,
})

function DashboardMembersPage() {
  return (
    <DashboardSectionPlaceholder title="Members" />
  )
}
