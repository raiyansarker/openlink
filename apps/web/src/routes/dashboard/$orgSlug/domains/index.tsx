import { createFileRoute } from '@tanstack/react-router'
import DashboardDomainsPanel from '#/components/dashboard/DashboardDomainsPanel'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/dashboard/$orgSlug/domains/')({
  head: createPageHead('Domains'),
  component: DomainsIndexPage,
})

function DomainsIndexPage() {
  return <DashboardDomainsPanel />
}
