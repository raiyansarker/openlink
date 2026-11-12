import { createFileRoute } from '@tanstack/react-router'
import DashboardSectionPlaceholder from '#/components/dashboard/DashboardSectionPlaceholder'

export const Route = createFileRoute('/dashboard/$orgSlug/reports')({
  component: DashboardReportsPage,
})

function DashboardReportsPage() {
  return <DashboardSectionPlaceholder title="Reports" />
}
