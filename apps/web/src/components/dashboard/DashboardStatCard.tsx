import { Card } from '@astryxdesign/core/Card'
import { Stack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { formatCompactNumber } from '#/lib/format/compact-number'
import type { DashboardStatCardModel } from '#/lib/dashboard/build-stat-cards'

type DashboardStatCardProps = {
  card: DashboardStatCardModel
}

export default function DashboardStatCard({ card }: DashboardStatCardProps) {
  return (
    <Card variant="default" padding={4}>
      <Stack gap={1}>
        <Text type="supporting" color="secondary">
          {card.label}
        </Text>
        <Text type="display-3" size="lg">
          {typeof card.value === 'number'
            ? formatCompactNumber(card.value)
            : card.value}
        </Text>
        <Text type="supporting" color="secondary" size="sm">
          {card.detail}
        </Text>
      </Stack>
    </Card>
  )
}
