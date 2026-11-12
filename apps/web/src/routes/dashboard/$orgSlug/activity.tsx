import { createFileRoute } from '@tanstack/react-router'
import DashboardSectionPlaceholder from '#/components/dashboard/DashboardSectionPlaceholder'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/dashboard/$orgSlug/activity')({
  head: createPageHead('Activity'),
  component: DashboardActivityPage,
})

function DashboardActivityPage() {
  return <DashboardSectionPlaceholder title="Activity" />
}
