import { useMemo } from 'react'
import { Card } from '@astryxdesign/core/Card'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import Sparkline from '#/components/analytics/Sparkline'
import { SERIES_COLORS } from '#/components/analytics/chart-theme'
import type { AnalyticsReport } from '#/lib/analytics/demo-dataset'
import {
  deltaDirection,
  formatCompact,
  formatDelta,
  formatNumber,
  formatPercent,
} from '#/lib/analytics/format'

type Tile = {
  key: string
  label: string
  value: string
  exact: string
  current: number
  previous: number
  /** For rates, a drop is not necessarily bad; for counts, up is good. */
  higherIsBetter: boolean
  spark: { time: Date; value: number }[]
  color: string
}

function DeltaText({ tile, isComparing }: { tile: Tile; isComparing: boolean }) {
  const delta = formatDelta(tile.current, tile.previous)
  if (!isComparing || delta == null) {
    return (
      <Text type="supporting" color="secondary">
        {tile.exact}
      </Text>
    )
  }
  const direction = deltaDirection(tile.current, tile.previous)
  const isGood = direction === 'flat' ? null : (direction === 'up') === tile.higherIsBetter
  return (
    <HStack gap={1} vAlign="center">
      <Text
        type="supporting"
        weight="semibold"
        style={{
          color:
            isGood == null
              ? 'var(--color-text-secondary)'
              : isGood
                ? 'var(--color-data-categorical-green)'
                : 'var(--color-data-categorical-red)',
        }}
      >
        {direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'} {delta}
      </Text>
      <Text type="supporting" color="secondary">
        vs previous
      </Text>
    </HStack>
  )
}

type MetricTilesProps = {
  report: AnalyticsReport
  isComparing: boolean
  /** Narrower tiles for side-by-side layouts such as a link's page. */
  isCompact?: boolean
  /** One link's report: averages read per day/hour instead of per link. */
  isSingleLink?: boolean
}

/** Headline numbers for the window, each with a period delta and a sparkline. */
export default function MetricTiles({
  report,
  isComparing,
  isCompact = false,
  isSingleLink = false,
}: MetricTilesProps) {
  const tiles = useMemo<Tile[]>(() => {
    const { totals, previousTotals, totalsSeries } = report
    const linkCount = Math.max(1, report.links.length)
    const repeatDetail = isSingleLink
      ? `${formatCompact(totals.clicks / Math.max(1, totalsSeries.length))} clicks per ${report.bucket}`
      : `${formatCompact(totals.clicks / linkCount)} clicks per link`
    const uniqueRate = totals.clicks ? totals.unique / totals.clicks : 0
    const previousUniqueRate = previousTotals.clicks ? previousTotals.unique / previousTotals.clicks : 0
    return [
      {
        key: 'clicks',
        label: 'Clicks',
        value: formatCompact(totals.clicks),
        exact: `${formatNumber(totals.clicks)} total`,
        current: totals.clicks,
        previous: previousTotals.clicks,
        higherIsBetter: true,
        spark: totalsSeries.map((p) => ({ time: p.time, value: p.clicks })),
        color: SERIES_COLORS[0],
      },
      {
        key: 'unique',
        label: 'Unique visitors',
        value: formatCompact(totals.unique),
        exact: `${formatPercent(uniqueRate)} of clicks`,
        current: totals.unique,
        previous: previousTotals.unique,
        higherIsBetter: true,
        spark: totalsSeries.map((p) => ({ time: p.time, value: p.unique })),
        color: SERIES_COLORS[1],
      },
      {
        key: 'qr',
        label: 'QR scans',
        value: formatCompact(totals.qr),
        exact: `${formatPercent(totals.clicks ? totals.qr / totals.clicks : 0)} of clicks`,
        current: totals.qr,
        previous: previousTotals.qr,
        higherIsBetter: true,
        spark: totalsSeries.map((p) => ({ time: p.time, value: p.qr })),
        color: SERIES_COLORS[2],
      },
      {
        key: 'repeat',
        label: 'Repeat clicks',
        value: formatPercent(1 - uniqueRate),
        exact: repeatDetail,
        current: 1 - uniqueRate,
        previous: 1 - previousUniqueRate,
        higherIsBetter: true,
        spark: totalsSeries.map((p) => ({
          time: p.time,
          value: p.clicks ? 1 - p.unique / p.clicks : 0,
        })),
        color: SERIES_COLORS[3],
      },
    ]
  }, [report, isSingleLink])

  return (
    <Grid columns={{ minWidth: isCompact ? 150 : 220, max: 4 }} gap={isCompact ? 3 : 4} width="100%">
      {tiles.map((tile) => (
        <Card key={tile.key} padding={4} style={{ minWidth: 0 }}>
          <VStack gap={3} hAlign="stretch" width="100%">
            <VStack gap={1} hAlign="start">
              <Text type="supporting" color="secondary">
                {tile.label}
              </Text>
              <Heading level={2}>{tile.value}</Heading>
              <DeltaText tile={tile} isComparing={isComparing} />
            </VStack>
            <Sparkline points={tile.spark} color={tile.color} label={`${tile.label} trend`} />
          </VStack>
        </Card>
      ))}
    </Grid>
  )
}
