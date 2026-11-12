import { HStack } from '@astryxdesign/core/HStack'
import { ProgressBar } from '@astryxdesign/core/ProgressBar'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import DeltaText from '#/components/analytics/DeltaText'
import Sparkline from '#/components/analytics/Sparkline'
import { SERIES_COLORS } from '#/components/analytics/chart-theme'
import { handleDomainsTableRowClick } from '#/components/domains/domains-table-row-click'
import type { LinkRow } from '#/lib/analytics/demo-dataset'
import { formatNumber, formatPercent } from '#/lib/analytics/format'

type Row = LinkRow & Record<string, unknown>

type TopLinksTableProps = {
  rows: LinkRow[]
  isComparing: boolean
  /** Drill the whole page down to one link. */
  onSelect: (linkId: string) => void
}

function destinationLabel(url: string): string {
  try {
    const { hostname, pathname } = new URL(url)
    return pathname === '/' ? hostname : `${hostname}${pathname}`
  } catch {
    return url
  }
}

/** Ranked short links with destination, volume, share, change, trend, and top source. */
export default function TopLinksTable({ rows, isComparing, onSelect }: TopLinksTableProps) {
  const data = rows as Row[]
  const topClicks = Math.max(1, ...rows.map((r) => r.clicks))

  return (
    <VStack
      className="members-table members-table--clickable-rows"
      width="100%"
      hAlign="stretch"
      onClick={(event) =>
        handleDomainsTableRowClick(event, data.length, (index) => {
          const row = data[index]
          if (row) onSelect(row.key)
        })
      }
    >
      <Table<Row>
        className="members-table__grid"
        data={data}
        idKey="key"
        density="balanced"
        dividers="rows"
        hasHover
        columns={[
          {
            key: 'rank',
            header: '#',
            width: pixel(52),
            renderCell: (row) => (
              <Text type="supporting" color="secondary">
                {data.indexOf(row) + 1}
              </Text>
            ),
          },
          {
            key: 'slug',
            header: 'Short link',
            width: proportional(1.3, { minWidth: 200 }),
            renderCell: (row) => (
              <VStack gap={0} hAlign="start">
                <Text weight="semibold" maxLines={1}>
                  /{row.slug}
                </Text>
                <Text type="supporting" color="secondary" maxLines={1}>
                  {destinationLabel(row.destination)}
                </Text>
              </VStack>
            ),
          },
          {
            key: 'clicks',
            header: 'Clicks',
            width: proportional(1, { minWidth: 160 }),
            renderCell: (row) => (
              <VStack gap={1} hAlign="stretch" width="100%">
                <HStack hAlign="between" gap={2} width="100%">
                  <Text weight="medium">{formatNumber(row.clicks)}</Text>
                  <Text type="supporting" color="secondary">
                    {formatPercent(row.share)}
                  </Text>
                </HStack>
                <ProgressBar
                  label={`${row.slug} clicks relative to the top link`}
                  isLabelHidden
                  value={row.clicks}
                  max={topClicks}
                />
              </VStack>
            ),
          },
          {
            key: 'unique',
            header: 'Unique',
            width: pixel(88),
            align: 'end',
            renderCell: (row) => <Text>{formatNumber(row.unique)}</Text>,
          },
          ...(isComparing
            ? [
                {
                  key: 'change',
                  header: 'Change',
                  width: pixel(84),
                  align: 'end' as const,
                  renderCell: (row: Row) => (
                    <DeltaText current={row.clicks} previous={row.previousClicks} />
                  ),
                },
              ]
            : []),
          {
            key: 'trend',
            header: 'Trend',
            width: pixel(112),
            renderCell: (row) => (
              <Sparkline
                points={row.trend}
                color={SERIES_COLORS[0]}
                label={`/${row.slug} clicks trend`}
                height={28}
              />
            ),
          },
          {
            key: 'source',
            header: 'Top source',
            width: pixel(140),
            renderCell: (row) => (
              <VStack gap={0} hAlign="start">
                <Text type="supporting" maxLines={1}>
                  {row.topReferrer}
                </Text>
                <Text type="supporting" color="secondary" maxLines={1}>
                  {row.topCountry}
                </Text>
              </VStack>
            ),
          },
        ]}
      />
    </VStack>
  )
}
