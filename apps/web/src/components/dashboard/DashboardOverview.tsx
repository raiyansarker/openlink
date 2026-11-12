import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { Card } from '@astryxdesign/core/Card'
import { Button } from '@astryxdesign/core/Button'
import { Divider } from '@astryxdesign/core/Divider'
import { useOrganization } from '#/contexts/OrganizationContext'
import { buildDashboardStatCards } from '#/lib/dashboard/build-stat-cards'
import DashboardRecentLinksTable from './DashboardRecentLinksTable'
import { HomeIcon, LinkIcon, BarChartIcon, UsersIcon, PlusIcon } from '#/components/icons/IcnMcp'

const STAT_ICONS = [HomeIcon, LinkIcon, BarChartIcon, UsersIcon]

export default function DashboardOverview() {
  const { activeOrg, stats } = useOrganization()
  const cards = buildDashboardStatCards(stats)

  return (
    <div style={{ padding: '36px 36px 52px' }}>
      <VStack gap={8}>

        {/* Page header */}
        <HStack hAlign="between" vAlign="start" gap={4} wrap="wrap">
          <VStack gap={1}>
            <Heading level={1}>Overview</Heading>
            <Text color="secondary">{activeOrg.name}</Text>
          </VStack>
          <Button
            variant="primary"
            label="Create link"
            icon={<PlusIcon size={14} style={{ display: 'flex' }} />}
          />
        </HStack>

        {/* Stat cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 14,
          }}
        >
          {cards.map((card, idx) => {
            const IcnIcon = STAT_ICONS[idx]
            return (
              <Card key={card.label} padding={5} elevation="low">
                <VStack gap={4}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      backgroundColor: '#f4f4f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#3f3f46',
                      flexShrink: 0,
                    }}
                  >
                    {IcnIcon && <IcnIcon size={16} />}
                  </div>
                  <VStack gap={1}>
                    <Heading level={3}>{String(card.value)}</Heading>
                    <Text type="supporting" color="secondary">{card.label}</Text>
                    <Text type="supporting" color="secondary">{card.detail}</Text>
                  </VStack>
                </VStack>
              </Card>
            )
          })}
        </div>

        <Divider />

        {/* Recent links */}
        <VStack gap={4}>
          <HStack hAlign="between" vAlign="center" gap={4}>
            <VStack gap={1}>
              <Heading level={2}>Recent links</Heading>
              <Text color="secondary">All short links in this workspace.</Text>
            </VStack>
            <Button variant="ghost" label="View all" />
          </HStack>
          <Card padding={0} elevation="low" style={{ overflow: 'hidden' }}>
            <DashboardRecentLinksTable />
          </Card>
        </VStack>
      </VStack>
    </div>
  )
}
