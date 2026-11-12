import { Card } from '@astryxdesign/core/Card'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { HStack } from '@astryxdesign/core/HStack'
import { VStack } from '@astryxdesign/core/VStack'
import type { DashboardStatCardModel } from '#/lib/dashboard/build-stat-cards'

type DashboardMetricStripProps = {
  cards: DashboardStatCardModel[]
}

export default function DashboardMetricStrip({ cards }: DashboardMetricStripProps) {
  return (
    <HStack gap={4} wrap="wrap">
      {cards.map((card) => (
        <Card key={card.label} padding={4} width={200}>
          <VStack gap={1}>
            <Text type="supporting" color="secondary">
              {card.label}
            </Text>
            <Heading level={3}>{card.value}</Heading>
            <Text type="supporting" color="secondary">
              {card.detail}
            </Text>
          </VStack>
        </Card>
      ))}
    </HStack>
  )
}
