import { createFileRoute } from '@tanstack/react-router'
import DashboardSectionPlaceholder from '#/components/dashboard/DashboardSectionPlaceholder'

export const Route = createFileRoute('/dashboard/$orgSlug/activity')({
  component: DashboardActivityPage,
})

function DashboardActivityPage() {
  return <DashboardSectionPlaceholder title="Activity" />
}
