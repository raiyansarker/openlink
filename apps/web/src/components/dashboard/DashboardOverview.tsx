import { Stack } from '@astryxdesign/core/Stack'
import { useOrganization } from '#/contexts/OrganizationContext'
import { buildDashboardStatCards } from '#/lib/dashboard/build-stat-cards'
import DashboardLinksPanel from './DashboardLinksPanel'
import DashboardMetricStrip from './DashboardMetricStrip'
import DashboardPageHeader from './DashboardPageHeader'

export default function DashboardOverview() {
  const { activeOrg, activeOrgId, links, stats } = useOrganization()
  const statCards = buildDashboardStatCards(stats)

  return (
    <Stack gap={5}>
      <DashboardPageHeader
        title="Overview"
        subtitle={`Workspace ${activeOrgId} · ${activeOrg.name}`}
      />
      <DashboardMetricStrip cards={statCards} />
      <DashboardLinksPanel organization={activeOrg} links={links} />
    </Stack>
  )
}
