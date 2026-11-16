import { createFileRoute } from '@tanstack/react-router'
import NotificationsPanel from '#/components/notifications/NotificationsPanel'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/w/$orgSlug/notifications')({
  head: createPageHead('Notifications'),
  component: NotificationsPanel,
})
