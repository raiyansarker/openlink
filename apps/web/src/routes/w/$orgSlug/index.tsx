import { createFileRoute } from '@tanstack/react-router'
import DashboardOverview from '#/components/dashboard/DashboardOverview'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/w/$orgSlug/')({
  head: createPageHead('Dashboard'),
  component: DashboardOverview,
})
