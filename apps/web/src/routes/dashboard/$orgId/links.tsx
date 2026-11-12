import { createFileRoute } from '@tanstack/react-router'
import DashboardComingSoon from '#/components/dashboard/DashboardComingSoon'

export const Route = createFileRoute('/dashboard/$orgId/links')({
  component: DashboardLinksPage,
})

function DashboardLinksPage() {
  return (
    <DashboardComingSoon
      title="Links manager"
      description="Bulk edit, filters, and creation flow will live here."
    />
  )
}
