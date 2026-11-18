import { useMemo, useState } from 'react'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import ActivityDetailSheet from '#/components/activity/ActivityDetailSheet'
import ActivityFeedContent from '#/components/activity/ActivityFeedContent'
import ActivityFilterBar from '#/components/activity/ActivityFilterBar'
import { useOrganization } from '#/contexts/OrganizationContext'
import { useActivityFeed } from '#/hooks/use-activity'
import { groupByDay } from '#/lib/activity/group-by-day'
import type { ActivityFilterState } from '#/lib/activity/filters'

type DashboardActivityPanelProps = {
  filters: ActivityFilterState
  onFiltersChange: (change: Partial<ActivityFilterState>) => void
}

export default function DashboardActivityPanel({ filters, onFiltersChange }: DashboardActivityPanelProps) {
  const { activeOrg } = useOrganization()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const feed = useActivityFeed(activeOrg.id, {
    ...(filters.category !== 'all' ? { category: filters.category } : {}),
    ...(filters.q.trim() ? { q: filters.q.trim() } : {}),
  })
  const events = useMemo(() => feed.data?.pages.flatMap((page) => page.items) ?? [], [feed.data])
  const groups = useMemo(() => groupByDay(events), [events])
  const selected = events.find((event) => event.id === selectedId) ?? null
  const isFiltered = filters.category !== 'all' || filters.q.trim() !== ''

  return (
    <VStack
      gap={8}
      hAlign="stretch"
      width="fill"
      paddingBlockStart={8}
      paddingInline={8}
      paddingBlockEnd={10}
    >
      <VStack gap={2} hAlign="start" width="fill">
        <Heading level={1}>Activity</Heading>
        <Text color="secondary" type="supporting">
          Everything that happened in {activeOrg.name}, newest first. New events appear on their own.
        </Text>
      </VStack>

      <VStack gap={6} hAlign="stretch" width="fill">
        <ActivityFilterBar filters={filters} onFiltersChange={onFiltersChange} />
        <ActivityFeedContent
          feed={feed}
          events={events}
          groups={groups}
          isFiltered={isFiltered}
          onSelect={setSelectedId}
        />
      </VStack>

      <ActivityDetailSheet
        event={selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
      />
    </VStack>
  )
}
