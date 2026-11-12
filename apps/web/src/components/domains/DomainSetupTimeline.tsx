import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import type { DomainTimelineEvent } from '#/lib/domains/domain-timeline'
import { formatShortDate } from '#/lib/format/short-date'

const TRACK_COLOR = 'var(--color-border-emphasized)'
const NODE_SIZE_PX = 8

type DomainSetupTimelineProps = {
  events: DomainTimelineEvent[]
}

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function DomainSetupTimeline({ events }: DomainSetupTimelineProps) {
  if (events.length === 0) return null

  return (
    <VStack gap={3} width="100%" hAlign="stretch">
      <Heading level={4}>Timeline</Heading>
      <VStack gap={0} width="100%">
        {events.map((event, index) => (
          <HStack
            key={event.id}
            gap={3}
            vAlign="stretch"
            width="100%"
            style={{ paddingBlockEnd: index < events.length - 1 ? 16 : 0 }}
          >
            <VStack
              gap={0}
              hAlign="center"
              vAlign="start"
              style={{ width: 20, flexShrink: 0 }}
            >
              <span
                style={{
                  display: 'block',
                  width: NODE_SIZE_PX,
                  height: NODE_SIZE_PX,
                  marginTop: 6,
                  borderRadius: '50%',
                  backgroundColor: TRACK_COLOR,
                  flexShrink: 0,
                }}
              />
              {index < events.length - 1 ? (
                <span
                  style={{
                    display: 'block',
                    width: 1,
                    flex: 1,
                    minHeight: 24,
                    marginTop: 4,
                    backgroundColor: TRACK_COLOR,
                  }}
                />
              ) : null}
            </VStack>
            <VStack gap={1} width="100%" paddingBlockEnd={2}>
              <HStack hAlign="between" vAlign="start" gap={2} width="100%">
                <Text weight="semibold">{event.title}</Text>
                <Text type="supporting" color="secondary">
                  {formatShortDate(event.occurredAt)} · {formatEventTime(event.occurredAt)}
                </Text>
              </HStack>
              {event.description ? (
                <Text type="supporting" color="secondary">
                  {event.description}
                </Text>
              ) : null}
            </VStack>
          </HStack>
        ))}
      </VStack>
    </VStack>
  )
}
