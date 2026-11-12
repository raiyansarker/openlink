import { createFileRoute } from '@tanstack/react-router'
import DashboardSectionPlaceholder from '#/components/dashboard/DashboardSectionPlaceholder'

export const Route = createFileRoute('/dashboard/$orgSlug/settings')({
  component: DashboardSettingsPage,
})

function DashboardSettingsPage() {
  return (
    <DashboardSectionPlaceholder title="Settings" />
  )
}
