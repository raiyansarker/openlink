import { HStack } from '@astryxdesign/core/HStack'
import { List, ListItem } from '@astryxdesign/core/List'
import { ProgressBar } from '@astryxdesign/core/ProgressBar'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import AnalyticsCard from '#/components/analytics/AnalyticsCard'
import DeltaText from '#/components/analytics/DeltaText'
import type { DestinationRow } from '#/lib/analytics/demo-dataset'
import { formatNumber, formatPercent } from '#/lib/analytics/format'

type DestinationsCardProps = {
  rows: DestinationRow[]
  isComparing: boolean
}

/** Pages people land on, combining every short link that points to the same URL. */
export default function DestinationsCard({ rows, isComparing }: DestinationsCardProps) {
  const top = Math.max(1, ...rows.map((r) => r.clicks))
  const shared = rows.filter((r) => r.linkCount > 1).length

  return (
    <AnalyticsCard
      title="Top destinations"
      description={
        shared > 0
          ? `Where clicks land · ${shared} ${shared === 1 ? 'page is' : 'pages are'} reached by several short links`
          : 'Where clicks land'
      }
    >
      <List density="compact">
        {rows.slice(0, 7).map((row) => (
          <ListItem
            key={row.key}
            itemKey={row.key}
            label={
              <VStack gap={1} hAlign="stretch" width="100%">
                <HStack hAlign="between" gap={3} width="100%">
                  <Text maxLines={1} weight="medium">
                    {row.label}
                  </Text>
                  <HStack gap={3} vAlign="center">
                    {isComparing ? (
                      <DeltaText current={row.clicks} previous={row.previousClicks} />
                    ) : null}
                    <Text weight="semibold">{formatNumber(row.clicks)}</Text>
                  </HStack>
                </HStack>
                <ProgressBar
                  label={`${row.label} clicks relative to the top destination`}
                  isLabelHidden
                  value={row.clicks}
                  max={top}
                />
              </VStack>
            }
            description={`${formatPercent(row.share)} of clicks · ${
              row.linkCount === 1 ? `/${row.slugs[0]}` : `${row.linkCount} links: ${row.slugs.map((s) => `/${s}`).join(', ')}`
            }`}
          />
        ))}
      </List>
    </AnalyticsCard>
  )
}
