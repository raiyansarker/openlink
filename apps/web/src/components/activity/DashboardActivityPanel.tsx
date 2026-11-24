import { useEffect, useMemo, useRef, useState } from 'react'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { InputGroup } from '@astryxdesign/core/InputGroup'
import { List, ListItem } from '@astryxdesign/core/List'
import { Selector } from '@astryxdesign/core/Selector'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import ActivityActorAvatar from '#/components/activity/ActivityActorAvatar'
import ActivityDetailSheet from '#/components/activity/ActivityDetailSheet'
import { useOrganization } from '#/contexts/OrganizationContext'
import { useIsPhone, usePageInsetSteps } from '#/hooks/use-is-phone'
import { ACTIVITY_CATEGORY_LABELS, ACTIVITY_SOURCE_LABELS } from '#/lib/activity/labels'
import type { ActivityEvent } from '#/lib/api/types'
import { QUERY_DEBOUNCE_MS, useActivityFeed } from '#/hooks/use-activity'
import { formatEventTime, groupByDay } from '#/lib/activity/group-by-day'
import {
  ACTIVITY_CATEGORIES,
  type ActivityFilterState,
  type CategoryFilter,
} from '#/lib/activity/filters'
import { apiErrorMessage } from '#/lib/api/errors'

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All activity' },
  ...ACTIVITY_CATEGORIES.map((value) => ({ value, label: ACTIVITY_CATEGORY_LABELS[value] })),
]

type DashboardActivityPanelProps = {
  filters: ActivityFilterState
  onFiltersChange: (change: Partial<ActivityFilterState>) => void
}

/** "Camille Laurent created link launch" with the people and things in bold. */
function ActivitySentence({ event }: { event: ActivityEvent }) {
  return (
    <Text maxLines={1}>
      <Text weight="semibold">{event.actor.label}</Text> {event.phrase}{' '}
      <Text weight="semibold">{event.target.label}</Text>
    </Text>
  )
}

export default function DashboardActivityPanel({ filters, onFiltersChange }: DashboardActivityPanelProps) {
  const { activeOrg } = useOrganization()
  const inset = usePageInsetSteps()
  const isPhone = useIsPhone()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Typing stays instant; the URL and the server query follow once typing pauses.
  const [draftQuery, setDraftQuery] = useState(filters.q)
  const queryTimer = useRef<number | undefined>(undefined)
  const changeQuery = (value: string) => {
    setDraftQuery(value)
    window.clearTimeout(queryTimer.current)
    queryTimer.current = window.setTimeout(() => {
      if (value !== filters.q) onFiltersChange({ q: value })
    }, QUERY_DEBOUNCE_MS)
  }
  useEffect(() => () => window.clearTimeout(queryTimer.current), [])

  const feed = useActivityFeed(activeOrg.id, {
    ...(filters.category !== 'all' ? { category: filters.category } : {}),
    ...(filters.q.trim() ? { q: filters.q.trim() } : {}),
  })
  const events = useMemo(() => feed.data?.pages.flatMap((page) => page.items) ?? [], [feed.data])
  const groups = useMemo(() => groupByDay(events), [events])
  const selected = events.find((event) => event.id === selectedId) ?? null
  const isFiltered = filters.category !== 'all' || filters.q.trim() !== ''

  // Load older events when the end of the list scrolls into view.
  const endRef = useRef<HTMLElement>(null)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = feed
  useEffect(() => {
    const end = endRef.current
    if (!end || !hasNextPage) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !isFetchingNextPage) void fetchNextPage()
      },
      { rootMargin: '400px 0px' },
    )
    observer.observe(end)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <VStack
      gap={8}
      hAlign="stretch"
      width="fill"
      paddingBlockStart={inset.block}
      paddingInline={inset.inline}
      paddingBlockEnd={10}
    >
      <VStack gap={2} hAlign="start" width="fill">
        <Heading level={1}>Activity</Heading>
        <Text color="secondary" type="supporting">
          Everything that happened in {activeOrg.name}, newest first. New events appear on their own.
        </Text>
      </VStack>

      <VStack gap={6} hAlign="stretch" width="fill">
        <InputGroup
          label="Filter activity"
          size="sm"
          // Phones: search on its own full-width row, category picker under it.
          style={isPhone ? { flexDirection: 'column' } : undefined}
        >
          <TextInput
            label="Search activity"
            isLabelHidden
            size="sm"
            placeholder="Search by person, action, or item"
            value={draftQuery}
            onChange={changeQuery}
            controlStyle={
              isPhone ? { width: '100%', minWidth: 0 } : { flex: '4 1 0', minWidth: 0, width: '80%' }
            }
          />
          <Selector
            label="Category"
            isLabelHidden
            variant="secondary"
            size="sm"
            width={isPhone ? '100%' : '20%'}
            controlStyle={{ flex: isPhone ? '1 1 100%' : '1 0 0', minWidth: 0, width: '100%' }}
            options={CATEGORY_OPTIONS}
            value={filters.category}
            onChange={(value) => onFiltersChange({ category: value as CategoryFilter })}
          />
        </InputGroup>

        {feed.isPending ? (
          <FeedSkeleton />
        ) : feed.isError && events.length === 0 ? (
          <Banner
            status="error"
            title={apiErrorMessage(feed.error, 'Activity could not be loaded.')}
            endContent={<Button variant="secondary" size="sm" label="Try again" onClick={() => void feed.refetch()} />}
          />
        ) : events.length === 0 ? (
          isFiltered ? (
            <Text type="supporting" color="secondary">
              No activity matches your filters.
            </Text>
          ) : (
            <EmptyState
              isCompact
              headingLevel={4}
              title="No activity yet"
              description="Changes to links, domains, members, and settings will show up here."
            />
          )
        ) : (
          <VStack gap={6} hAlign="stretch" width="fill">
            {groups.map((group) => (
              <VStack key={group.key} gap={2} hAlign="stretch" width="fill">
                <Heading level={5} weight="bold" color="secondary">
                  {group.label}
                </Heading>
                <List className="activity-list activity-timeline" density="balanced">
                  {group.items.map((event) => (
                    <ListItem
                      key={event.id}
                      itemKey={event.id}
                      onClick={() => setSelectedId(event.id)}
                      startContent={<ActivityActorAvatar actor={event.actor} />}
                      label={<ActivitySentence event={event} />}
                      description={`${ACTIVITY_CATEGORY_LABELS[event.category]} · ${ACTIVITY_SOURCE_LABELS[event.source]}`}
                      endContent={
                        <HStack gap={2} vAlign="center">
                          <Text type="supporting" color="secondary">
                            {formatEventTime(event.occurredAt)}
                          </Text>
                          <Icon icon="chevronRight" size="sm" color="secondary" />
                        </HStack>
                      }
                    />
                  ))}
                </List>
              </VStack>
            ))}

            {/* End of the list: scrolling here loads the next page; the button is the fallback. */}
            <VStack ref={endRef as never} hAlign="center" width="fill" paddingBlock={2}>
              {hasNextPage ? (
                <Button
                  variant="ghost"
                  size="sm"
                  label="Load older activity"
                  isLoading={isFetchingNextPage}
                  onClick={() => void fetchNextPage()}
                />
              ) : (
                <Text type="supporting" color="secondary">
                  {events.length > 20 ? 'That’s everything.' : ''}
                </Text>
              )}
            </VStack>
          </VStack>
        )}
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

/** The feed's shape while the first page loads. */
function FeedSkeleton() {
  return (
    <VStack gap={4} hAlign="stretch" width="fill" aria-busy="true" aria-label="Loading activity">
      {[0, 1, 2, 3, 4].map((index) => (
        <HStack key={index} gap={3} vAlign="center" width="fill">
          <Skeleton index={index * 2} width={32} height={32} radius="rounded" />
          <VStack gap={2} hAlign="stretch" style={{ flex: 1 }}>
            <Skeleton index={index * 2 + 1} width="55%" height={14} />
            <Skeleton index={index * 2 + 1} width="25%" height={12} />
          </VStack>
        </HStack>
      ))}
    </VStack>
  )
}
