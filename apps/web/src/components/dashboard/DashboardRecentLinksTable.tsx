import { useMemo } from 'react'
import { Section } from '@astryxdesign/core/Section'
import { Stack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
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
    <Section>
      <Stack gap={3}>
        <Stack gap={0.5}>
          <Text type="display-3">Recent links</Text>
          <Text type="supporting" color="secondary">
            Sort columns to explore click performance for {organization.name}.
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
  )
}
