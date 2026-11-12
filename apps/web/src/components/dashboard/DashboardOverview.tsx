import { Section } from '@astryxdesign/core/Section'
import { VStack } from '@astryxdesign/core/VStack'
import { useOrganization } from '#/contexts/OrganizationContext'
import { buildDashboardStatCards } from '#/lib/dashboard/build-stat-cards'
import DashboardPageHeader from './DashboardPageHeader'
import DashboardMetricStrip from './DashboardMetricStrip'
import DashboardRecentLinksTable from './DashboardRecentLinksTable'

export default function DashboardOverview() {
  const { activeOrg, stats } = useOrganization()
  const cards = buildDashboardStatCards(stats)

  return (
    <Section padding={6}>
      <VStack gap={6}>
        <DashboardPageHeader
          title="Dashboard"
          subtitle={`${activeOrg.name} — live metrics and recent short links.`}
        />
        <DashboardMetricStrip cards={cards} />
        <VStack gap={3}>
          <DashboardPageHeader
            title="Recent links"
            subtitle="Newest short links in this workspace."
            showCreate={false}
          />
          <DashboardRecentLinksTable />
        </VStack>
      </VStack>
    </Section>
  )
}
