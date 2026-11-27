import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { HStack } from '@astryxdesign/core/HStack'
import {
  Table,
  TableSelectionToolbar,
  pixel,
  proportional,
  useTableSelection,
  useTableSelectionState,
  useTableSortable,
} from '@astryxdesign/core/Table'
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
import { usePermissions } from '#/hooks/use-permissions'
import type { ShortLink } from '#/lib/api/types'
import { formatCompactNumber } from '#/lib/format/compact-number'
import { formatShortDate } from '#/lib/format/short-date'
import { linkStatusLabel, linkTargetUrl, linkTitle } from '#/lib/links/link-summary'
import { stripUrlScheme } from '#/lib/links/strip-url-scheme'
import { sortLinks, type LinkSort, type LinkSortKey } from '#/lib/links/sort-links'

type BulkActions = {
  /** Open the move dialog for the given links. */
  onMove: (linkIds: string[]) => void
  /** Open the delete confirmation for the given links. */
  onDelete: (linkIds: string[]) => void
}

type LinksListViewProps = Pick<ItemMenus, 'linkMenu'> & {
  links: ShortLink[]
  /** Row click (outside menus and buttons). */
  onOpenLink: (link: ShortLink) => void
  /** When set, rows show checkboxes and selected rows get bulk actions. */
  bulkActions?: BulkActions
}

type Row = ShortLink & Record<string, unknown>

export default function LinksListView({
  links,
  linkMenu,
  onOpenLink,
  bulkActions,
}: LinksListViewProps) {
  const rows = links as Row[]
  const rowPlugins = useMemo(
    () => ({ open: clickableRows<Row>((row) => onOpenLink(row), (row) => `Open ${linkTitle(row)}`) }),
    [onOpenLink],
  )
  const { shortUrlFor } = useOrganization()
  // Dragging moves a link; viewers have the menu and rows, but no drag handle.
  const { canManageLinks } = usePermissions()

  // Column sorting; an empty sort keeps the caller's order (newest first).
  const [sort, setSort] = useState<LinkSort[]>([])
  const sortedRows = useMemo(() => sortLinks(rows, sort), [rows, sort])
  const sortPlugin = useTableSortable<Row, LinkSortKey>({
    sort,
    onSortChange: setSort,
    allowUnsortedState: true,
  })

  // Bulk selection; ids that no longer exist are dropped below so the
  // selection follows the data after a bulk move or delete refreshes.
  const [selectedKeys, setSelectedKeys] = useState(() => new Set<string>())
  const { selectionConfig, selectionState } = useTableSelectionState<Row>({
    data: sortedRows,
    idKey: 'id',
    selectedKeys,
    setSelectedKeys,
  })
  const selectionPlugin = useTableSelection({
    ...selectionConfig,
    getRowLabel: (row) => linkTitle(row),
  })

  useEffect(() => {
    setSelectedKeys((previous) => {
      if (previous.size === 0) return previous
      const present = new Set(rows.map((row) => row.id))
      const next = new Set([...previous].filter((id) => present.has(id)))
      return next.size === previous.size ? previous : next
    })
  }, [rows])

  const plugins = bulkActions
    ? { ...rowPlugins, sort: sortPlugin, selection: selectionPlugin }
    : { ...rowPlugins, sort: sortPlugin }

  const selectedIds = [...selectionState.selectedKeys]

  return (
    <VStack gap={3} hAlign="stretch" width="100%">
      {bulkActions && selectionState.hasSelection ? (
        <TableSelectionToolbar
          selection={selectionState}
          label="Selected links"
          startContent={
            <>
              <Button
                variant="ghost"
                size="sm"
                label="Move to…"
                onClick={() => bulkActions.onMove(selectedIds)}
              />
              <Button
                variant="ghost"
                size="sm"
                label="Delete"
                onClick={() => bulkActions.onDelete(selectedIds)}
              />
            </>
          }
        />
      ) : null}
      {/* Each row opens its link; nested controls keep their own behaviour. */}
      <VStack hAlign="stretch" width="100%">
        <Table<Row>
          data={sortedRows}
          idKey="id"
          className="table-nowrap"
          density="balanced"
          dividers="rows"
          hasHover
          plugins={plugins}
          columns={[
            {
              key: 'title',
              header: 'Name',
              width: proportional(2, { minWidth: 220 }),
              renderCell: (row) => (
                // Drag the name onto a folder tile or breadcrumb to move the link.
                <span
                  draggable={canManageLinks}
                  onDragStart={(e: DragEvent) => {
                    if (!canManageLinks) return
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
                      <Text weight="semibold">
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
                  <Text type="supporting" color="secondary">
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
                  <Text type="supporting" color="secondary">
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
              // A lone "Open details" item repeats the row click: no menu to open.
              renderCell: (row) => {
                const items = linkMenu(row)
                return items.length > 1 ? (
                  <ItemMenuButton label={linkTitle(row)} items={items} />
                ) : null
              },
            },
          ]}
        />
      </VStack>
    </VStack>
  )
}
