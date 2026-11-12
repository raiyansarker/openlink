import { createFileRoute } from '@tanstack/react-router'
import DashboardLinksPanel from '#/components/dashboard/DashboardLinksPanel'

export const Route = createFileRoute('/dashboard/$orgSlug/links')({
  component: DashboardLinksPage,
})

function DashboardLinksPage() {
  return <DashboardLinksPanel />
}
