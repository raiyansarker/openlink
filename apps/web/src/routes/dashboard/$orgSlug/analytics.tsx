import { createFileRoute } from '@tanstack/react-router'
import DashboardSectionPlaceholder from '#/components/dashboard/DashboardSectionPlaceholder'

export const Route = createFileRoute('/dashboard/$orgSlug/analytics')({
  component: DashboardAnalyticsPage,
})

function DashboardAnalyticsPage() {
  return (
    <DashboardSectionPlaceholder
      title="Analytics"
      description="Traffic, referrers, and engagement for your links."
    />
  )
}
