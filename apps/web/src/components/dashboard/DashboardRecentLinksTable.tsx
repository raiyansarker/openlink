import { useMemo } from 'react'
import {
  Table,
  useTableSortable,
  useTableSortableState,
} from '@astryxdesign/core/Table'
import type { Organization } from '#/data/demo/types'
import { shortUrlFor } from '#/data/demo/short-url'
import type { ShortLink } from '#/data/demo/types'
import {
  useLinkTableColumns,
  type LinkTableRow,
} from './useLinkTableColumns'

type DashboardRecentLinksTableProps = {
  organization: Organization
  links: ShortLink[]
}

export default function DashboardRecentLinksTable({
  organization,
  links,
}: DashboardRecentLinksTableProps) {
  const columns = useLinkTableColumns()

  const tableData = useMemo<LinkTableRow[]>(
    () =>
      links.map((link) => ({
        ...link,
        shortUrl: shortUrlFor(link.slug, organization),
      })),
    [links, organization],
  )

  const { sortedData, sortConfig } = useTableSortableState<LinkTableRow>({
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

  return (
    <Table
      data={sortedData}
      columns={columns}
      idKey="id"
      hasHover
      density="compact"
      dividers="rows"
      // @ts-expect-error sort plugin row generic defaults to Record<string, unknown>
      plugins={{ sortable: sortPlugin }}
      textOverflow="truncate"
    />
  )
}
