import type { ReactNode } from 'react'
import { Drawer, DrawerHeader } from '@astryxdesign/core/Drawer'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent } from '@astryxdesign/core/Layout'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import ActivityActorAvatar from '#/components/activity/ActivityActorAvatar'
import {
  FLOATING_END_DRAWER_PADDING,
  floatingEndDrawerStyle,
} from '#/components/members/floating-end-drawer'
import {
  ACTIVITY_CATEGORY_LABELS,
  type WorkspaceActivityEvent,
} from '#/data/demo/workspace-activity'
import { formatSessionDate } from '#/lib/settings/session-time'

type ActivityDetailSheetProps = {
  event: WorkspaceActivityEvent | null
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
  'api-key': 'API key',
  system: 'System',
} as const

export default function ActivityDetailSheet({
  event,
  onOpenChange,
}: ActivityDetailSheetProps) {
  if (!event) return null

  return (
    <Drawer
      isOpen
      onOpenChange={onOpenChange}
      label="Activity details"
      side="end"
      width={420}
      hasScrim
      purpose="info"
      padding={FLOATING_END_DRAWER_PADDING}
      style={floatingEndDrawerStyle()}
    >
      <Layout
        header={
          <DrawerHeader
            title="Activity"
            subtitle={ACTIVITY_CATEGORY_LABELS[event.category]}
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={6} hAlign="stretch" width="100%">
              <HStack gap={3} vAlign="start" width="100%">
                <ActivityActorAvatar actor={event.actor} size={40} />
                <VStack gap={0.5} hAlign="start">
                  <Text>
                    <Text weight="semibold">{event.actor.name}</Text>{' '}
                    {event.action} <Text weight="semibold">{event.target}</Text>
                  </Text>
                  <Text type="supporting" color="secondary">
                    {formatSessionDate(event.occurredAt)}
                  </Text>
                </VStack>
              </HStack>

              {event.details?.length ? (
                <VStack gap={3} hAlign="stretch" width="100%">
                  {event.details.map((detail) => (
                    <DetailRow key={detail.label} label={detail.label}>
                      {detail.value}
                    </DetailRow>
                  ))}
                </VStack>
              ) : null}

              <VStack gap={3} hAlign="stretch" width="100%">
                <DetailRow label="Done by">
                  {ACTOR_KIND_LABEL[event.actor.kind]}
                </DetailRow>
                <DetailRow label="Source">{event.source}</DetailRow>
                {event.ipAddress ? (
                  <DetailRow label="IP address">{event.ipAddress}</DetailRow>
                ) : null}
                <DetailRow label="Event ID">{event.id}</DetailRow>
              </VStack>
            </VStack>
          </LayoutContent>
        }
      />
    </Drawer>
  )
}
