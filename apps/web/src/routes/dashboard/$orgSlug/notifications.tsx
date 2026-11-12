import { createFileRoute } from '@tanstack/react-router'
import DashboardSectionPlaceholder from '#/components/dashboard/DashboardSectionPlaceholder'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/dashboard/$orgSlug/notifications')({
  head: createPageHead('Notifications'),
  component: DashboardNotificationsPage,
})

function DashboardNotificationsPage() {
  return <DashboardSectionPlaceholder title="Notifications" />
}
