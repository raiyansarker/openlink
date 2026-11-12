import { createFileRoute } from '@tanstack/react-router'
import DashboardSectionPlaceholder from '#/components/dashboard/DashboardSectionPlaceholder'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/dashboard/$orgSlug/analytics')({
  head: createPageHead('Analytics'),
  component: DashboardAnalyticsPage,
})

function DashboardAnalyticsPage() {
  return (
    <DashboardSectionPlaceholder title="Analytics" />
  )
}
