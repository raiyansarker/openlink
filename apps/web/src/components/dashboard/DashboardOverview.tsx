import { Stack } from '@astryxdesign/core/Stack'
import { useOrganization } from '#/contexts/OrganizationContext'
import { buildDashboardStatCards } from '#/lib/dashboard/build-stat-cards'
import DashboardPageHeader from './DashboardPageHeader'
import DashboardRecentLinksTable from './DashboardRecentLinksTable'
import DashboardStatGrid from './DashboardStatGrid'

export default function DashboardOverview() {
  const { activeOrg, links, stats } = useOrganization()
  const statCards = buildDashboardStatCards(stats)

  return (
    <Stack gap={5}>
      <DashboardPageHeader
        title="Overview"
        subtitle={`Performance snapshot for ${activeOrg.name} — demo metrics only.`}
      />
      <DashboardStatGrid cards={statCards} />
      <DashboardRecentLinksTable organization={activeOrg} links={links} />
    </Stack>
  )
}
