import { useState } from 'react'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import type { LinkHistoryEvent } from '#/data/demo/types'
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
        {event.excerpt ? (
          <Text
            type="supporting"
            maxLines={2}
            style={{
              paddingInlineStart: 'var(--spacing-3)',
              borderInlineStart: `2px solid ${TRACK_COLOR}`,
              color: 'var(--color-text-secondary)',
              marginBlockStart: 'var(--spacing-1)',
            }}
          >
            {event.excerpt}
          </Text>
        ) : null}
      </VStack>
    </HStack>
  )
}

type Filter = 'all' | 'edits' | 'status' | 'checks' | 'comments'

const FILTERS: { value: Filter; label: string; types: LinkHistoryEvent['type'][] }[] = [
  { value: 'all', label: 'All', types: [] },
  { value: 'edits', label: 'Edits', types: ['created', 'updated', 'moved', 'tagged', 'duplicated'] },
  { value: 'status', label: 'Hold', types: ['held', 'released'] },
  { value: 'checks', label: 'Health checks', types: ['checked'] },
  { value: 'comments', label: 'Comments', types: ['commented'] },
]

function matches(filter: Filter, event: LinkHistoryEvent): boolean {
  if (filter === 'all') return true
  return FILTERS.find((f) => f.value === filter)!.types.includes(event.type)
}

/** "3 people · 12 events since Nov 2" style one-liner above the timeline. */
function summaryLine(events: LinkHistoryEvent[]): string {
  const people = new Set(events.map((e) => e.actor)).size
  const oldest = events.reduce((a, b) => (new Date(a.at) < new Date(b.at) ? a : b))
  const edits = events.filter((e) => matches('edits', e)).length
  const parts = [
    `${events.length} ${events.length === 1 ? 'event' : 'events'}`,
    `${edits} ${edits === 1 ? 'edit' : 'edits'}`,
    `${people} ${people === 1 ? 'person' : 'people'}`,
    `since ${formatShortDate(oldest.at)}`,
  ]
  return parts.join(' · ')
}

/** Who changed what and when, grouped by day, newest first, with type filters. */
export default function LinkHistoryTimeline({ events }: { events: LinkHistoryEvent[] }) {
  const [filter, setFilter] = useState<Filter>('all')

  if (events.length === 0) {
    return (
      <Text type="supporting" color="secondary">
        No changes recorded yet.
      </Text>
    )
  }

  const groups = groupByDay(events.filter((event) => matches(filter, event)))
  // Only offer filters that have something behind them.
  const available = FILTERS.filter(
    (f) => f.value === 'all' || events.some((event) => matches(f.value, event)),
  )

  return (
    <VStack gap={8} hAlign="stretch" width="100%" style={{ maxWidth: 760 }}>
      <VStack gap={4} hAlign="start" width="100%">
        <Text type="supporting" color="secondary">
          {summaryLine(events)}
        </Text>
        {available.length > 2 ? (
          <SegmentedControl
            label="Filter history"
            value={filter}
            onChange={(value) => setFilter(value as Filter)}
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
        </VStack>
      )}
    </VStack>
  )
}
