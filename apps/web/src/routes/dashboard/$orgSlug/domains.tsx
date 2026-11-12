import { createFileRoute } from '@tanstack/react-router'
import DashboardSectionPlaceholder from '#/components/dashboard/DashboardSectionPlaceholder'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/dashboard/$orgSlug/domains')({
  head: createPageHead('Domains'),
  component: DashboardDomainsPage,
})

function DashboardDomainsPage() {
  return <DashboardSectionPlaceholder title="Domains" />
}
