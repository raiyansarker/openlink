import { createFileRoute } from '@tanstack/react-router'
import DashboardSectionPlaceholder from '#/components/dashboard/DashboardSectionPlaceholder'

export const Route = createFileRoute('/dashboard/$orgSlug/notifications')({
  component: DashboardNotificationsPage,
})

function DashboardNotificationsPage() {
  return <DashboardSectionPlaceholder title="Notifications" />
}
