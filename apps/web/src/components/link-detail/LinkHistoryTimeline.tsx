import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { useEffect, useRef } from 'react'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import type { LinkHistoryEvent } from '#/data/demo/types'
import type { LinkHistoryKind, LinkHistorySummary } from '#/lib/api/link-history'
import { formatShortDate } from '#/lib/format/short-date'

/** Same track/node language as MemberActivityTimeline and DomainSetupTimeline. */
const TRACK_COLOR = 'var(--color-border-emphasized)'
const NODE_SIZE_PX = 8

type DayGroup = { dayLabel: string; events: LinkHistoryEvent[] }

function startOfDay(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function dayLabel(iso: string): string {
  const diffDays = Math.round(
    (startOfDay(new Date()) - startOfDay(new Date(iso))) / 86_400_000,
  )
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return formatShortDate(iso)
}

function groupByDay(events: LinkHistoryEvent[]): DayGroup[] {
  const sorted = [...events].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  )
  const order: string[] = []
  const buckets = new Map<string, LinkHistoryEvent[]>()
  for (const event of sorted) {
    const label = dayLabel(event.at)
    if (!buckets.has(label)) {
      buckets.set(label, [])
      order.push(label)
    }
    buckets.get(label)!.push(event)
  }
  return order.map((label) => ({ dayLabel: label, events: buckets.get(label)! }))
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function EventNode({
  event,
  showConnector,
}: {
  event: LinkHistoryEvent
  showConnector: boolean
}) {
  return (
    <HStack gap={3} vAlign="stretch" width="100%">
      <VStack gap={0} hAlign="center" vAlign="start" style={{ width: 20, flexShrink: 0 }}>
        <span
          aria-hidden
          style={{
            display: 'block',
            width: NODE_SIZE_PX,
            height: NODE_SIZE_PX,
            marginTop: 6,
            borderRadius: '50%',
            border: `2px solid ${TRACK_COLOR}`,
            backgroundColor: 'var(--color-background-surface)',
            boxSizing: 'border-box',
          }}
        />
        {showConnector ? (
          <span
            aria-hidden
            style={{
              display: 'block',
              width: 2,
              flex: 1,
              minHeight: 28,
              marginTop: 4,
              backgroundColor: TRACK_COLOR,
              borderRadius: 1,
            }}
          />
        ) : null}
      </VStack>
      <VStack
        gap={0.5}
        hAlign="start"
        paddingBlockEnd={showConnector ? 4 : 0}
        style={{ flex: 1, minWidth: 0 }}
      >
        <HStack hAlign="between" vAlign="start" gap={2} width="100%" wrap="wrap">
          <Text weight="semibold">{event.summary}</Text>
          <Text type="supporting" color="secondary">
            {formatTime(event.at)}
          </Text>
        </HStack>
        <Text type="supporting" color="secondary">
          {event.actor}
        </Text>
        {event.changes?.map((change) => (
          <Text key={change.label} type="supporting" style={{ wordBreak: 'break-word' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>{change.label}: </span>
            <span
              style={{
                textDecoration: 'line-through',
                color: 'var(--color-text-secondary)',
              }}
            >
              {change.from || '—'}
            </span>
            {' → '}
            {change.to || '—'}
          </Text>
        ))}
      </VStack>
    </HStack>
  )
}

/** The History filter; null is "All". Kept in the URL by the route. */
export type HistoryKind = LinkHistoryKind

const FILTERS: { value: HistoryKind | 'all'; label: string; count: (summary: LinkHistorySummary) => number }[] = [
  { value: 'all', label: 'All', count: (summary) => summary.total },
  { value: 'edits', label: 'Edits', count: (summary) => summary.edits },
  { value: 'hold', label: 'Hold', count: (summary) => summary.holds },
]

/** "26 events · 22 edits · 2 people · since Nov 2", over the whole history. */
function summaryLine(summary: LinkHistorySummary): string {
  const parts = [
    `${summary.total} ${summary.total === 1 ? 'event' : 'events'}`,
    `${summary.edits} ${summary.edits === 1 ? 'edit' : 'edits'}`,
    `${summary.people} ${summary.people === 1 ? 'person' : 'people'}`,
    ...(summary.since ? [`since ${formatShortDate(summary.since)}`] : []),
  ]
  return parts.join(' · ')
}

/** Who changed what and when, grouped by day, newest first, with type filters. */
type LinkHistoryTimelineProps = {
  events: LinkHistoryEvent[]
  summary?: LinkHistorySummary
  kind: HistoryKind | null
  onKindChange: (kind: HistoryKind | null) => void
  isLoading?: boolean
  loadError?: unknown
  onRetry?: () => void
  hasMore?: boolean
  isLoadingMore?: boolean
  onLoadMore?: () => void
}

export default function LinkHistoryTimeline({
  events,
  summary,
  kind,
  onKindChange,
  isLoading = false,
  loadError,
  onRetry,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: LinkHistoryTimelineProps) {
  // Load older events when the end of the list scrolls into view.
  const endRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const end = endRef.current
    if (!end || !hasMore || !onLoadMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !isLoadingMore) onLoadMore()
      },
      { rootMargin: '400px 0px' },
    )
    observer.observe(end)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, onLoadMore])

  if (loadError && events.length === 0) {
    return (
      <Banner
        status="error"
        title="The history could not be loaded."
        endContent={onRetry ? <Button variant="secondary" size="sm" label="Try again" onClick={onRetry} /> : undefined}
      />
    )
  }
  if (isLoading) {
    return (
      <VStack gap={5} hAlign="stretch" width="100%" style={{ maxWidth: 760 }} aria-busy="true" aria-label="Loading history">
        <Skeleton index={0} width={240} height={14} />
        {[1, 2, 3].map((index) => (
          <VStack key={index} gap={2} hAlign="stretch">
            <Skeleton index={index * 2} width={200} height={14} />
            <Skeleton index={index * 2 + 1} width={120} height={12} />
          </VStack>
        ))}
      </VStack>
    )
  }

  if (!summary || summary.total === 0) {
    return (
      <Text type="supporting" color="secondary">
        No changes recorded yet.
      </Text>
    )
  }

  const groups = groupByDay(events)
  // Only offer filters that have something behind them.
  const available = FILTERS.filter((f) => f.value === 'all' || f.count(summary) > 0)

  return (
    <VStack gap={8} hAlign="stretch" width="100%" style={{ maxWidth: 760 }}>
      <VStack gap={4} hAlign="start" width="100%">
        <Text type="supporting" color="secondary">
          {summaryLine(summary)}
        </Text>
        {available.length > 2 ? (
          <SegmentedControl
            label="Filter history"
            value={kind ?? 'all'}
            onChange={(value) => onKindChange(value === 'all' ? null : (value as HistoryKind))}
            size="sm"
          >
            {available.map((f) => (
              <SegmentedControlItem key={f.value} value={f.value} label={f.label} />
            ))}
          </SegmentedControl>
        ) : null}
      </VStack>

      {groups.length === 0 ? (
        <Text type="supporting" color="secondary">
          Nothing of this kind yet.
        </Text>
      ) : (
        <VStack gap={6} hAlign="stretch" width="100%">
          {groups.map((group) => (
            <VStack key={group.dayLabel} gap={3} hAlign="stretch" width="100%">
              <Heading level={5} weight="bold" color="secondary">
                {group.dayLabel}
              </Heading>
              <VStack gap={0} hAlign="stretch" width="100%">
                {group.events.map((event, index) => (
                  <EventNode
                    key={event.id}
                    event={event}
                    showConnector={index < group.events.length - 1}
                  />
                ))}
              </VStack>
            </VStack>
          ))}

          {/* End of the list: scrolling here loads the next page; the button is the fallback. */}
          <VStack ref={endRef as never} hAlign="start" width="100%">
            {hasMore && onLoadMore ? (
              <Button variant="ghost" size="sm" label="Load older history" isLoading={isLoadingMore} onClick={onLoadMore} />
            ) : null}
          </VStack>
        </VStack>
      )}
    </VStack>
  )
}
