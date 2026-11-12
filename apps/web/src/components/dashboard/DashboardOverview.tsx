import { Stack } from '@astryxdesign/core/Stack'
import { useOrganization } from '#/contexts/OrganizationContext'
import { buildDashboardStatCards } from '#/lib/dashboard/build-stat-cards'
import DashboardOrgHeader from './DashboardOrgHeader'
import DashboardRecentLinksTable from './DashboardRecentLinksTable'
import DashboardStatGrid from './DashboardStatGrid'

export default function DashboardOverview() {
  const { activeOrg, links, stats } = useOrganization()
  const statCards = buildDashboardStatCards(stats)

  return (
    <Stack gap={4}>
      <DashboardOrgHeader organization={activeOrg} />
      <DashboardStatGrid cards={statCards} />
      <DashboardRecentLinksTable organization={activeOrg} links={links} />
    </Stack>
  )
}
