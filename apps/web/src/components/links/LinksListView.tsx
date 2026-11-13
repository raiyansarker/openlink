import type { DragEvent } from 'react'
import { HStack } from '@astryxdesign/core/HStack'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import Favicon from '#/components/create-link/Favicon'
import { handleDomainsTableRowClick } from '#/components/domains/domains-table-row-click'
import ItemMenuButton from '#/components/links/ItemMenuButton'
import {
  DRAG_MIME,
  type ItemMenus,
} from '#/components/links/links-browser-types'
import { shortUrlFor } from '#/data/demo/short-url'
import type { Organization, ShortLink } from '#/data/demo/types'
import { formatCompactNumber } from '#/lib/format/compact-number'
import { formatShortDate } from '#/lib/format/short-date'
import { healthNeedsAttention } from '#/lib/links/demo-health'
import { linkStatusLabel } from '#/lib/links/link-summary'
import { stripUrlScheme } from '#/lib/links/strip-url-scheme'

type LinksListViewProps = Pick<ItemMenus, 'linkMenu'> & {
  links: ShortLink[]
  org: Organization
  /** Row click (outside menus and buttons). */
  onOpenLink: (link: ShortLink) => void
}

type Row = ShortLink & Record<string, unknown>

export default function LinksListView({
  links,
  org,
  linkMenu,
  onOpenLink,
}: LinksListViewProps) {
  const rows = links as Row[]

  return (
    <VStack gap={3} hAlign="stretch" width="100%">
      {/* Row click opens the link; nested controls keep their own behaviour. */}
      <div
        onClick={(event) =>
          handleDomainsTableRowClick(event, rows.length, (index) =>
            onOpenLink(links[index]!),
          )
        }
        style={{ cursor: 'pointer' }}
      >
        <Table<Row>
          data={rows}
          idKey="id"
          density="balanced"
          dividers="rows"
          hasHover
          columns={[
            {
              key: 'title',
              header: 'Name',
              width: proportional(2, { minWidth: 220 }),
              renderCell: (row) => (
                // Drag the name onto a folder tile or breadcrumb to move the link.
                <span
                  draggable
                  onDragStart={(e: DragEvent) => {
                    e.dataTransfer.setData(DRAG_MIME, `link:${row.id}`)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    minWidth: 0,
                    overflow: 'hidden',
                  }}
                >
                  <HStack
                    gap={3}
                    vAlign="center"
                    width="100%"
                    style={{ minWidth: 0 }}
                  >
                    <span style={{ flexShrink: 0, display: 'inline-flex' }}>
                      <Favicon url={row.destinationUrl ?? row.targetUrl} size={16} />
                    </span>
                    <VStack gap={1} style={{ minWidth: 0, flex: '1 1 0', overflow: 'hidden' }}>
                      <Text weight="semibold" maxLines={1}>
                        {row.title}
                      </Text>
                    </VStack>
                  </HStack>
                </span>
              ),
            },
            {
              key: 'shortUrl',
              header: 'Short URL',
              width: proportional(2, { minWidth: 160 }),
              renderCell: (row) => (
                <span style={{ display: 'block', minWidth: 0, overflow: 'hidden' }}>
                  <Text type="supporting" color="secondary" maxLines={1}>
                    {shortUrlFor(row.slug, org, row.domainId).replace(/^https?:\/\//, '')}
                  </Text>
                </span>
              ),
            },
            {
              key: 'targetUrl',
              header: 'Destination',
              width: proportional(2, { minWidth: 160 }),
              renderCell: (row) => (
                <span style={{ display: 'block', minWidth: 0, overflow: 'hidden' }}>
                  <Text type="supporting" color="secondary" maxLines={1}>
                    {stripUrlScheme(row.targetUrl)}
                  </Text>
                </span>
              ),
            },
            {
              key: 'clicks',
              header: 'Clicks',
              width: pixel(88),
              align: 'end',
              renderCell: (row) => (
                <Text weight="medium">{formatCompactNumber(row.clicks)}</Text>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              width: pixel(140),
              renderCell: (row) => (
                <VStack gap={0}>
                  <Text>{linkStatusLabel(row)}</Text>
                  {healthNeedsAttention(row.health) ? (
                    <Text type="supporting" color="secondary">
                      Destination broken
                    </Text>
                  ) : null}
                </VStack>
              ),
            },
            {
              key: 'createdAt',
              header: 'Created',
              width: pixel(108),
              align: 'end',
              renderCell: (row) => (
                <Text type="supporting" color="secondary">
                  {formatShortDate(row.createdAt)}
                </Text>
              ),
            },
            {
              key: 'actions',
              header: '',
              width: pixel(48),
              align: 'end',
              renderCell: (row) => (
                <ItemMenuButton label={row.title} items={linkMenu(row)} />
              ),
            },
          ]}
        />
      </div>
    </VStack>
  )
}
