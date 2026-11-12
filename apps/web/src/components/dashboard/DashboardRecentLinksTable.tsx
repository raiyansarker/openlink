import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { shortUrlFor } from '#/data/demo/short-url'
import type { ShortLink } from '#/data/demo/types'
import { useOrganization } from '#/contexts/OrganizationContext'
import { formatCompactNumber } from '#/lib/format/compact-number'
import { formatShortDate } from '#/lib/format/short-date'
import { stripUrlScheme } from '#/lib/links/strip-url-scheme'
import LinkStatus from './LinkStatus'

type LinkRow = ShortLink & Record<string, unknown>

export default function DashboardRecentLinksTable() {
  const { links, activeOrg } = useOrganization()
  const rows = links as LinkRow[]

  return (
    <Table<LinkRow>
      data={rows}
      idKey="id"
      density="balanced"
      dividers="rows"
      hasHover
      columns={[
        {
          key: 'title',
          header: 'Link',
          width: proportional(2, { minWidth: 200 }),
          renderCell: (row) => (
            <VStack gap={1}>
              <Text weight="semibold">{row.title}</Text>
              <Text type="supporting" color="secondary">
                {shortUrlFor(row.slug, activeOrg)}
              </Text>
            </VStack>
          ),
        },
        {
          key: 'targetUrl',
          header: 'Destination',
          width: proportional(2, { minWidth: 180 }),
          renderCell: (row) => (
            <Text type="supporting" color="secondary">
              {stripUrlScheme(row.targetUrl)}
            </Text>
          ),
        },
        {
          key: 'status',
          header: 'Status',
          width: pixel(140),
          renderCell: (row) => <LinkStatus status={row.status} />,
        },
        {
          key: 'clicks',
          header: 'Clicks',
          width: pixel(96),
          align: 'end',
          renderCell: (row) => (
            <Text type="supporting">{formatCompactNumber(row.clicks)}</Text>
          ),
        },
        {
          key: 'createdAt',
          header: 'Created',
          width: pixel(120),
          renderCell: (row) => (
            <Text type="supporting" color="secondary">
              {formatShortDate(row.createdAt)}
            </Text>
          ),
        },
      ]}
    />
  )
}
