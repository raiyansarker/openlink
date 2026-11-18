import { useMemo, type DragEvent } from 'react'
import { HStack } from '@astryxdesign/core/HStack'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import Favicon from '#/components/create-link/Favicon'
import { clickableRows } from '#/lib/tables/clickable-rows'
import ItemMenuButton from '#/components/links/ItemMenuButton'
import {
  DRAG_MIME,
  type ItemMenus,
} from '#/components/links/links-browser-types'
import { useOrganization } from '#/contexts/OrganizationContext'
import type { ShortLink } from '#/lib/api/types'
import { formatCompactNumber } from '#/lib/format/compact-number'
import { formatShortDate } from '#/lib/format/short-date'
import { linkStatusLabel, linkTargetUrl, linkTitle } from '#/lib/links/link-summary'
import { stripUrlScheme } from '#/lib/links/strip-url-scheme'

type LinksListViewProps = Pick<ItemMenus, 'linkMenu'> & {
  links: ShortLink[]
  /** Row click (outside menus and buttons). */
  onOpenLink: (link: ShortLink) => void
}

type Row = ShortLink & Record<string, unknown>

export default function LinksListView({
  links,
  linkMenu,
  onOpenLink,
}: LinksListViewProps) {
  const rows = links as Row[]
  const rowPlugins = useMemo(
    () => ({ open: clickableRows<Row>((row) => onOpenLink(row), (row) => `Open ${linkTitle(row)}`) }),
    [onOpenLink],
  )
  const { shortUrlFor } = useOrganization()

  return (
    <VStack gap={3} hAlign="stretch" width="100%">
      {/* Each row opens its link; nested controls keep their own behaviour. */}
      <VStack hAlign="stretch" width="100%">
        <Table<Row>
          data={rows}
          idKey="id"
          density="balanced"
          dividers="rows"
          hasHover
          plugins={rowPlugins}
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
                    {shortUrlFor(row.slug, row.domainId).replace(/^https?:\/\//, '')}
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
                    {stripUrlScheme(linkTargetUrl(row))}
                  </Text>
                </span>
              ),
            },
            {
              key: 'clickCount',
              header: 'Clicks',
              width: pixel(88),
              align: 'end',
              renderCell: (row) => (
                <Text weight="medium">{formatCompactNumber(row.clickCount)}</Text>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              width: pixel(140),
              renderCell: (row) => (
                <Text>{linkStatusLabel(row)}</Text>
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
                <ItemMenuButton label={linkTitle(row)} items={linkMenu(row)} />
              ),
            },
          ]}
        />
      </VStack>
    </VStack>
  )
}
