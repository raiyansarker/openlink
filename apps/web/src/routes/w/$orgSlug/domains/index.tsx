import { createFileRoute } from '@tanstack/react-router'
import DashboardDomainsPanel from '#/components/dashboard/DashboardDomainsPanel'
import { useOrganization } from '#/contexts/OrganizationContext'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/w/$orgSlug/domains/')({
  head: createPageHead('Domains'),
  component: DomainsIndexPage,
})

function DomainsIndexPage() {
  const { activeOrg } = useOrganization()
  // A different workspace starts with a fresh search, filter and open sheet.
  return <DashboardDomainsPanel key={activeOrg.id} />
}
