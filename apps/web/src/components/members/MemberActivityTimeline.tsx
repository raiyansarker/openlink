import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import type { MemberActivityEvent } from '#/data/demo/types'
import { formatShortDate } from '#/lib/format/short-date'

type ActivityDayGroup = {
  dayLabel: string
  events: MemberActivityEvent[]
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
  events: MemberActivityEvent[],
): ActivityDayGroup[] {
  const sorted = [...events].sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  )

  const order: string[] = []
  const buckets = new Map<string, MemberActivityEvent[]>()

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

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

type TimelineEventNodeProps = {
  event: MemberActivityEvent
  showConnector: boolean
}

function TimelineEventNode({ event, showConnector }: TimelineEventNodeProps) {
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
      <VStack gap={0.5} hAlign="start" paddingBlockEnd={showConnector ? 4 : 0}>
        <HStack
          hAlign="between"
          vAlign="start"
          gap={2}
          width="100%"
          wrap="wrap"
        >
          <Text weight="semibold">{event.title}</Text>
          <Text type="supporting" color="secondary">
            {formatEventTime(event.occurredAt)}
          </Text>
        </HStack>
        {event.description ? (
          <Text type="supporting" color="secondary">
            {event.description}
          </Text>
        ) : null}
      </VStack>
    </HStack>
  )
}

type MemberActivityTimelineProps = {
  events: MemberActivityEvent[]
}

export default function MemberActivityTimeline({
  events,
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
              />
            ))}
          </VStack>
        </VStack>
      ))}
    </VStack>
  )
}
