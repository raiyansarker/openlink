import { createFileRoute } from '@tanstack/react-router'
import DashboardSectionPlaceholder from '#/components/dashboard/DashboardSectionPlaceholder'

export const Route = createFileRoute('/dashboard/$orgSlug/links')({
  component: DashboardLinksPage,
})

function DashboardLinksPage() {
  return (
    <DashboardSectionPlaceholder
      title="Links"
      description="Create, edit, and filter short URLs for this organization."
    />
  )
}
