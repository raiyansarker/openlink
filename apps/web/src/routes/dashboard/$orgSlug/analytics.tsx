import { createFileRoute } from '@tanstack/react-router'
import DashboardAnalyticsPanel from '#/components/analytics/DashboardAnalyticsPanel'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/dashboard/$orgSlug/analytics')({
  head: createPageHead('Analytics'),
  component: DashboardAnalyticsPage,
})

function DashboardAnalyticsPage() {
  return <DashboardAnalyticsPanel />
}
