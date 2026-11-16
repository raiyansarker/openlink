import { createFileRoute } from '@tanstack/react-router'
import DashboardSectionPlaceholder from '#/components/dashboard/DashboardSectionPlaceholder'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/w/$orgSlug/reports')({
  head: createPageHead('Reports'),
  component: DashboardReportsPage,
})

function DashboardReportsPage() {
  return <DashboardSectionPlaceholder title="Reports" />
}
