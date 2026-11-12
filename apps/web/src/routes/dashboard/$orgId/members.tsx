import { createFileRoute } from '@tanstack/react-router'
import DashboardComingSoon from '#/components/dashboard/DashboardComingSoon'

export const Route = createFileRoute('/dashboard/$orgId/members')({
  component: DashboardMembersPage,
})

function DashboardMembersPage() {
  return (
    <DashboardComingSoon
      title="Members"
      description="Invite teammates and manage roles when organization APIs land."
    />
  )
}
