import { useMemo } from 'react'
import { Badge } from '@astryxdesign/core/Badge'
import { Card } from '@astryxdesign/core/Card'
import { Grid } from '@astryxdesign/core/Grid'
import { Section } from '@astryxdesign/core/Section'
import { Stack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import {
  Table,
  useTableSortable,
  useTableSortableState,
  proportional,
} from '@astryxdesign/core/Table'
import type { TableColumn } from '@astryxdesign/core/Table'
import { useOrganization } from '#/contexts/OrganizationContext'
import { shortUrlFor } from '#/data/demo/fixtures'
import type { ShortLink } from '#/data/demo/types'

type LinkRow = ShortLink & {
  shortUrl: string
}

function statusVariant(
  status: ShortLink['status'],
): 'success' | 'warning' | 'neutral' {
  if (status === 'active') {
    return 'success'
  }
  if (status === 'paused') {
    return 'warning'
  }
  return 'neutral'
}

const numberFormatter = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export default function DashboardOverview() {
  const { activeOrg, links, stats } = useOrganization()

  const tableData = useMemo<LinkRow[]>(
  () =>
      links.map((link) => ({
        ...link,
        shortUrl: shortUrlFor(link.slug, activeOrg),
      })),
    [activeOrg, links],
  )

  const columns = useMemo<TableColumn<LinkRow>[]>(
    () => [
      {
        key: 'shortUrl',
        header: 'Short link',
        width: proportional(2, { minWidth: 160 }),
        renderCell: (item) => (
          <Stack gap={0.5}>
            <Text type="body" weight="semibold">
              {item.shortUrl.replace('https://', '')}
            </Text>
            <Text type="supporting" color="secondary">
              {item.title}
            </Text>
          </Stack>
        ),
      },
      {
        key: 'clicks',
        header: 'Clicks',
        width: proportional(1, { minWidth: 72 }),
        align: 'end',
        renderCell: (item) => numberFormatter.format(item.clicks),
      },
      {
        key: 'uniqueClicks',
        header: 'Unique',
        width: proportional(1, { minWidth: 72 }),
        align: 'end',
        renderCell: (item) => numberFormatter.format(item.uniqueClicks),
      },
      {
        key: 'status',
        header: 'Status',
        width: proportional(1, { minWidth: 96 }),
        renderCell: (item) => (
          <Badge variant={statusVariant(item.status)} label={item.status} />
        ),
      },
      {
        key: 'createdAt',
        header: 'Created',
        width: proportional(1, { minWidth: 112 }),
        renderCell: (item) => dateFormatter.format(new Date(item.createdAt)),
      },
    ],
    [],
  )

  const { sortedData, sortConfig } = useTableSortableState<LinkRow>({
    data: tableData,
    defaultSort: [{ sortKey: 'clicks', direction: 'descending' }],
    comparators: {
      clicks: (a, b) => a.clicks - b.clicks,
      uniqueClicks: (a, b) => a.uniqueClicks - b.uniqueClicks,
      createdAt: (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
  })
  const sortPlugin = useTableSortable(sortConfig)

  const statCards = [
    {
      label: 'Total links',
      value: stats.totalLinks,
      detail: `${stats.activeLinks} active`,
    },
    {
      label: 'Clicks today',
      value: stats.clicksToday,
      detail: 'Across all short links',
    },
    {
      label: 'Clicks this week',
      value: stats.clicksThisWeek,
      detail: `${numberFormatter.format(stats.uniqueVisitorsWeek)} unique visitors`,
    },
    {
      label: 'Top referrer',
      value: stats.topReferrer,
      detail: 'Last 7 days',
    },
  ]

  return (
    <Stack gap={4}>
      <Section>
        <Stack gap={1}>
          <Text type="display-2">{activeOrg.name}</Text>
          <Text type="supporting" color="secondary">
            {activeOrg.plan} plan · {activeOrg.memberCount} members · demo data
          </Text>
        </Stack>
      </Section>

      <Grid columns={{ minWidth: 200, max: 4 }} gap={3}>
        {statCards.map((card) => (
          <Card key={card.label} variant="default" padding={4}>
            <Stack gap={1}>
              <Text type="supporting" color="secondary">
                {card.label}
              </Text>
              <Text type="display-3" size="lg">
                {typeof card.value === 'number'
                  ? numberFormatter.format(card.value)
                  : card.value}
              </Text>
              <Text type="supporting" color="secondary" size="sm">
                {card.detail}
              </Text>
            </Stack>
          </Card>
        ))}
      </Grid>

      <Section>
        <Stack gap={3}>
          <Stack gap={0.5}>
            <Text type="display-3">Recent links</Text>
            <Text type="supporting" color="secondary">
              Sort columns to explore click performance for {activeOrg.name}.
            </Text>
          </Stack>
          <Table
            data={sortedData}
            columns={columns}
            idKey="id"
            hasHover
            // @ts-expect-error sort plugin row generic defaults to Record<string, unknown>
            plugins={{ sortable: sortPlugin }}
            textOverflow="truncate"
          />
        </Stack>
      </Section>
    </Stack>
  )
}
