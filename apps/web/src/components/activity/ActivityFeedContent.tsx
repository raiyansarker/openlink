import { useEffect, useRef } from 'react'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { List, ListItem } from '@astryxdesign/core/List'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import ActivityActorAvatar from '#/components/activity/ActivityActorAvatar'
import type { useActivityFeed } from '#/hooks/use-activity'
import { ACTIVITY_CATEGORY_LABELS, ACTIVITY_SOURCE_LABELS } from '#/lib/activity/labels'
import { formatEventTime, type DayGroup } from '#/lib/activity/group-by-day'
import { apiErrorMessage } from '#/lib/api/errors'
import type { ActivityEvent } from '#/lib/api/types'

/** "Camille Laurent created link launch" with the people and things in bold. */
function ActivitySentence({ event }: { event: ActivityEvent }) {
  return (
    <Text maxLines={1}>
      <Text weight="semibold">{event.actor.label}</Text> {event.phrase}{' '}
      <Text weight="semibold">{event.target.label}</Text>
    </Text>
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

type ActivityFeedContentProps = {
  feed: ReturnType<typeof useActivityFeed>
  events: ActivityEvent[]
  groups: DayGroup<ActivityEvent>[]
  /** A category or search is applied, so "empty" means "nothing matches". */
  isFiltered: boolean
  onSelect: (eventId: string) => void
}

/** Day groups of events, or the loading, error and empty states; loads older events as the end scrolls into view. */
export default function ActivityFeedContent({
  feed,
  events,
  groups,
  isFiltered,
  onSelect,
}: ActivityFeedContentProps) {
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

  if (feed.isPending) return <FeedSkeleton />
  if (feed.isError && events.length === 0) {
    return (
      <Banner
        status="error"
        title={apiErrorMessage(feed.error, 'Activity could not be loaded.')}
        endContent={<Button variant="secondary" size="sm" label="Try again" onClick={() => void feed.refetch()} />}
      />
    )
  }
  if (events.length === 0) {
    return isFiltered ? (
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
  }

  return (
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
                onClick={() => onSelect(event.id)}
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
  )
}
