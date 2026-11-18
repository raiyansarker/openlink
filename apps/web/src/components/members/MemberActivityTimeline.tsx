import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { ACTIVITY_CATEGORY_LABELS, ACTIVITY_SOURCE_LABELS } from '#/lib/activity/labels'
import type { ActivityEvent } from '#/lib/api/types'
import { formatShortDate } from '#/lib/format/short-date'

type ActivityDayGroup = {
  dayLabel: string
  events: ActivityEvent[]
}

const TRACK_COLOR = 'var(--color-border-emphasized)'
const NODE_SIZE_PX = 8

function startOfDay(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function dayGroupLabel(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const todayStart = startOfDay(now)
  const dateStart = startOfDay(date)
  const diffDays = Math.round((todayStart - dateStart) / 86_400_000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return formatShortDate(iso)
}

function groupActivitiesByDay(
  events: ActivityEvent[],
): ActivityDayGroup[] {
  const sorted = [...events].sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  )

  const order: string[] = []
  const buckets = new Map<string, ActivityEvent[]>()

  for (const event of sorted) {
    const label = dayGroupLabel(event.occurredAt)
    if (!buckets.has(label)) {
      buckets.set(label, [])
      order.push(label)
    }
    buckets.get(label)?.push(event)
  }

  return order.map((dayLabel) => ({
    dayLabel,
    events: buckets.get(dayLabel) ?? [],
  }))
}

/** "Created link go/launch", from the event's phrase and target. */
/** "Moved link **google.com**": the action as a sentence, the item in bold. */
function EventSentence({ event }: { event: ActivityEvent }) {
  return (
    <Text>
      {`${event.phrase[0]!.toUpperCase()}${event.phrase.slice(1)} `}
      <Text weight="semibold">{event.target.label}</Text>
    </Text>
  )
}

/** What changed, one row per setting: old value struck through, new value after it. */
function EventChanges({ changes }: { changes: NonNullable<ActivityEvent['changes']> }) {
  return (
    <VStack
      gap={1.5}
      hAlign="stretch"
      width="100%"
      style={{
        padding: 'var(--spacing-2) var(--spacing-3)',
        borderRadius: 'var(--radius-element)',
        backgroundColor: 'var(--color-background-muted)',
      }}
    >
      {changes.map((change) => (
        <HStack key={change.label} gap={3} vAlign="start" width="100%">
          <Text type="supporting" color="secondary" maxLines={1} style={{ width: 88, flexShrink: 0 }}>
            {change.label}
          </Text>
          <Text type="supporting" maxLines={2} style={{ minWidth: 0 }}>
            {change.from ? (
              <Text type="supporting" color="secondary" style={{ textDecoration: 'line-through' }}>
                {change.from}
              </Text>
            ) : null}
            {change.from ? ' → ' : ''}
            {change.to || '—'}
          </Text>
        </HStack>
      ))}
    </VStack>
  )
}

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

type TimelineEventNodeProps = {
  event: ActivityEvent
  showConnector: boolean
  onOpen?: (event: ActivityEvent) => void
}

function TimelineEventNode({ event, showConnector, onOpen }: TimelineEventNodeProps) {
  const body = (
    <VStack gap={1.5} hAlign="stretch" width="100%">
      <HStack gap={2} hAlign="between" vAlign="start" width="100%">
        <VStack gap={0.5} hAlign="start" style={{ minWidth: 0 }}>
          <EventSentence event={event} />
          <Text type="supporting" color="secondary">
            {[
              ACTIVITY_CATEGORY_LABELS[event.category],
              ACTIVITY_SOURCE_LABELS[event.source],
              formatEventTime(event.occurredAt),
              ...(event.ipAddress ? [event.ipAddress] : []),
            ].join(' · ')}
          </Text>
        </VStack>
        {onOpen ? <Icon icon="chevronRight" size="sm" color="secondary" /> : null}
      </HStack>
      {event.changes?.length ? <EventChanges changes={event.changes} /> : null}
    </VStack>
  )

  return (
    <HStack gap={3} vAlign="stretch" width="100%">
      <VStack
        gap={0}
        hAlign="center"
        vAlign="start"
        style={{ width: 20, flexShrink: 0 }}
      >
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
        gap={0}
        hAlign="stretch"
        paddingBlockEnd={showConnector ? 4 : 0}
        style={{ flex: 1, minWidth: 0 }}
      >
        {onOpen ? (
          // The whole event opens its full details (who, where from, event ID).
          <button
            type="button"
            className="ol-focus-ring ol-timeline-event"
            aria-label={`Open details: ${event.phrase} ${event.target.label}`}
            onClick={() => onOpen(event)}
          >
            {body}
          </button>
        ) : (
          body
        )}
      </VStack>
    </HStack>
  )
}

type MemberActivityTimelineProps = {
  events: ActivityEvent[]
  /** Opens an event's full details; without it, events are not clickable. */
  onOpenEvent?: (event: ActivityEvent) => void
}

export default function MemberActivityTimeline({
  events,
  onOpenEvent,
}: MemberActivityTimelineProps) {
  const groups = groupActivitiesByDay(events)

  if (groups.length === 0) {
    return (
      <Text type="supporting" color="secondary">
        No activity recorded yet.
      </Text>
    )
  }

  return (
    <VStack gap={6} hAlign="stretch" width="100%">
      {groups.map((group) => (
        <VStack key={group.dayLabel} gap={3} hAlign="stretch" width="100%">
          <Heading level={5} weight="bold" color="secondary">
            {group.dayLabel}
          </Heading>
          <VStack gap={0} hAlign="stretch" width="100%">
            {group.events.map((event, index) => (
              <TimelineEventNode
                key={event.id}
                event={event}
                showConnector={index < group.events.length - 1}
                onOpen={onOpenEvent}
              />
            ))}
          </VStack>
        </VStack>
      ))}
    </VStack>
  )
}
