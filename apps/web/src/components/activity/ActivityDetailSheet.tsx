import { useState, type ReactNode } from 'react'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import ActivityActorAvatar from '#/components/activity/ActivityActorAvatar'
import ResponsiveDetailSheet from '#/components/common/ResponsiveDetailSheet'
import { ACTIVITY_CATEGORY_LABELS, ACTIVITY_SOURCE_LABELS, changeSummary } from '#/lib/activity/labels'
import type { ActivityEvent } from '#/lib/api/types'
import { formatSessionDate } from '#/lib/settings/session-time'

type ActivityDetailSheetProps = {
  event: ActivityEvent | null
  onOpenChange: (open: boolean) => void
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <HStack hAlign="between" vAlign="start" gap={4} width="100%">
      <Text type="supporting" color="secondary">
        {label}
      </Text>
      <Text type="supporting" maxLines={2} style={{ textAlign: 'end' }}>
        {children}
      </Text>
    </HStack>
  )
}

const ACTOR_KIND_LABEL = {
  member: 'Member',
  api_key: 'API key',
  system: 'System',
} as const

export default function ActivityDetailSheet({
  event: current,
  onOpenChange,
}: ActivityDetailSheetProps) {
  // Keep the last event on screen while the drawer animates closed.
  const [event, setEvent] = useState(current)
  if (current && current !== event) setEvent(current)
  if (!event) return null

  // Phone: a bottom sheet; desktop: the floating right-side drawer.
  return (
    <ResponsiveDetailSheet
      isOpen={current != null}
      onOpenChange={onOpenChange}
      label="Activity details"
      title="Activity"
      subtitle={ACTIVITY_CATEGORY_LABELS[event.category]}
      width={420}
      purpose="info"
    >
      <VStack gap={6} hAlign="stretch" width="100%">
              <HStack gap={3} vAlign="start" width="100%">
                <ActivityActorAvatar actor={event.actor} size={40} />
                <VStack gap={0.5} hAlign="start">
                  <Text>
                    <Text weight="semibold">{event.actor.label}</Text>{' '}
                    {event.phrase} <Text weight="semibold">{event.target.label}</Text>
                  </Text>
                  <Text type="supporting" color="secondary">
                    {formatSessionDate(event.occurredAt)}
                  </Text>
                </VStack>
              </HStack>

              {event.changes?.length ? (
                <VStack gap={3} hAlign="stretch" width="100%">
                  {event.changes.map((change) => (
                    <DetailRow key={change.label} label={change.label}>
                      {changeSummary(change)}
                    </DetailRow>
                  ))}
                </VStack>
              ) : null}

              <VStack gap={3} hAlign="stretch" width="100%">
                <DetailRow label="Done by">
                  {ACTOR_KIND_LABEL[event.actor.type]}
                </DetailRow>
                <DetailRow label="Source">{ACTIVITY_SOURCE_LABELS[event.source]}</DetailRow>
                {event.ipAddress ? (
                  <DetailRow label="IP address">{event.ipAddress}</DetailRow>
                ) : null}
                <DetailRow label="Event ID">{event.id}</DetailRow>
              </VStack>
            </VStack>
    </ResponsiveDetailSheet>
  )
}
