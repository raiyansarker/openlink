import { createFileRoute } from '@tanstack/react-router'
import DashboardComingSoon from '#/components/dashboard/DashboardComingSoon'

export const Route = createFileRoute('/dashboard/$orgId/analytics')({
  component: DashboardAnalyticsPage,
})

function DashboardAnalyticsPage() {
  return (
    <DashboardComingSoon
      title="Analytics"
      description="Charts and referrers will render here once the analytics API is connected."
    />
  )
}
