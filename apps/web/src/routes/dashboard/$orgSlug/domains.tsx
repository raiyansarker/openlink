import { createFileRoute } from '@tanstack/react-router'
import DashboardSectionPlaceholder from '#/components/dashboard/DashboardSectionPlaceholder'

export const Route = createFileRoute('/dashboard/$orgSlug/domains')({
  component: DashboardDomainsPage,
})

function DashboardDomainsPage() {
  return <DashboardSectionPlaceholder title="Domains" />
}
