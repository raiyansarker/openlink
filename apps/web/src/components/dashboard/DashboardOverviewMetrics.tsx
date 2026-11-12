import { Divider } from '@astryxdesign/core/Divider'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import type { OrgDashboardStats } from '#/data/demo/types'
import { buildDashboardStatCards } from '#/lib/dashboard/build-stat-cards'

type DashboardOverviewMetricsProps = {
  stats: OrgDashboardStats
}

export default function DashboardOverviewMetrics({
  stats,
}: DashboardOverviewMetricsProps) {
  const cards = buildDashboardStatCards(stats)

  return (
    <VStack gap={6} width="fill">
      <Divider variant="subtle" />
      <HStack gap={10} wrap="wrap" width="fill" vAlign="start">
        {cards.map((card) => (
          <VStack key={card.label} gap={1} width={176}>
            <Text type="supporting" color="secondary">
              {card.label}
            </Text>
            <Heading level={3} maxLines={1}>
              {String(card.value)}
            </Heading>
            <Text type="supporting" color="placeholder">
              {card.detail}
            </Text>
          </VStack>
        ))}
      </HStack>
      <Divider variant="subtle" />
    </VStack>
  )
}
