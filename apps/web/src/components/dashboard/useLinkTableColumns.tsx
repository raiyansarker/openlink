import { useMemo } from 'react'
import { Badge } from '@astryxdesign/core/Badge'
import { Stack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { proportional, type TableColumn } from '@astryxdesign/core/Table'
import { formatCompactNumber } from '#/lib/format/compact-number'
import { formatShortDate } from '#/lib/format/short-date'
import { linkStatusBadgeVariant } from '#/lib/links/status-badge-variant'
import { stripUrlScheme } from '#/lib/links/strip-url-scheme'
import type { ShortLink } from '#/data/demo/types'

export type LinkTableRow = ShortLink & {
  shortUrl: string
}

export function useLinkTableColumns(): TableColumn<LinkTableRow>[] {
  return useMemo(
    () => [
      {
        key: 'shortUrl',
        header: 'Short link',
        width: proportional(2, { minWidth: 160 }),
        renderCell: (item) => (
          <Stack gap={0.5}>
            <Text type="body" weight="semibold">
              {stripUrlScheme(item.shortUrl)}
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
        renderCell: (item) => formatCompactNumber(item.clicks),
      },
      {
        key: 'uniqueClicks',
        header: 'Unique',
        width: proportional(1, { minWidth: 72 }),
        align: 'end',
        renderCell: (item) => formatCompactNumber(item.uniqueClicks),
      },
      {
        key: 'status',
        header: 'Status',
        width: proportional(1, { minWidth: 96 }),
        renderCell: (item) => (
          <Badge
            variant={linkStatusBadgeVariant(item.status)}
            label={item.status}
          />
        ),
      },
      {
        key: 'createdAt',
        header: 'Created',
        width: proportional(1, { minWidth: 112 }),
        renderCell: (item) => formatShortDate(item.createdAt),
      },
    ],
    [],
  )
}
