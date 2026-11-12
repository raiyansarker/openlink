import { Grid } from '@astryxdesign/core/Grid'
import { HStack } from '@astryxdesign/core/HStack'
import { List, ListItem } from '@astryxdesign/core/List'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import AnalyticsCard from '#/components/analytics/AnalyticsCard'
import DeltaText from '#/components/analytics/DeltaText'
import type { AnalyticsReport, LinkRow } from '#/lib/analytics/demo-dataset'
import { formatNumber } from '#/lib/analytics/format'

type MoversCardProps = {
  movers: AnalyticsReport['movers']
  onSelect: (linkId: string) => void
}

function MoverList({
  title,
  rows,
  empty,
  onSelect,
}: {
  title: string
  rows: LinkRow[]
  empty: string
  onSelect: (linkId: string) => void
}) {
  return (
    <VStack gap={2} hAlign="stretch" width="100%">
      <Text type="supporting" weight="semibold" color="secondary">
        {title}
      </Text>
      {rows.length === 0 ? (
        <Text type="supporting" color="secondary">
          {empty}
        </Text>
      ) : (
        <List className="activity-list" density="compact">
          {rows.map((row) => (
            <ListItem
              key={row.key}
              itemKey={row.key}
              onClick={() => onSelect(row.key)}
              label={`/${row.slug}`}
              description={`${formatNumber(row.previousClicks)} → ${formatNumber(row.clicks)} clicks`}
              endContent={<DeltaText current={row.clicks} previous={row.previousClicks} />}
            />
          ))}
        </List>
      )}
    </VStack>
  )
}

/** Which links gained or lost the most clicks against the previous period. */
export default function MoversCard({ movers, onSelect }: MoversCardProps) {
  return (
    <AnalyticsCard title="Biggest movers" description="Change in clicks vs the previous period">
      <Grid columns={{ minWidth: 220, max: 2 }} gap={5} width="100%">
        <MoverList
          title="Rising"
          rows={movers.rising}
          empty="No link grew this period."
          onSelect={onSelect}
        />
        <MoverList
          title="Falling"
          rows={movers.falling}
          empty="No link dropped this period."
          onSelect={onSelect}
        />
      </Grid>
      <HStack>
        <Text type="supporting" color="secondary">
          Select a link to see its full breakdown.
        </Text>
      </HStack>
    </AnalyticsCard>
  )
}
