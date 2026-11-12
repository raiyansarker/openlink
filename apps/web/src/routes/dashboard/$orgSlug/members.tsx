import { createFileRoute } from '@tanstack/react-router'
import DashboardSectionPlaceholder from '#/components/dashboard/DashboardSectionPlaceholder'

export const Route = createFileRoute('/dashboard/$orgSlug/members')({
  component: DashboardMembersPage,
})

function DashboardMembersPage() {
  return (
    <DashboardSectionPlaceholder title="Members" />
  )
}
