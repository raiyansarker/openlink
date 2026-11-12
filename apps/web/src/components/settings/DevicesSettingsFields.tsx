import { useState, type ReactNode } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Badge } from '@astryxdesign/core/Badge'
import { Button } from '@astryxdesign/core/Button'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { List, ListItem } from '@astryxdesign/core/List'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import {
  AllInOneIcon,
  LaptopIcon,
  SmartphoneIcon,
} from '#/components/icons/IcnMcp'
import DeviceDetailSheet from '#/components/settings/DeviceDetailSheet'
import {
  DEMO_ACTIVE_SESSIONS,
  type ActiveSession,
  type DeviceKind,
} from '#/data/demo/active-sessions'
import { formatLastActive } from '#/lib/settings/session-time'

const DEVICE_ICONS: Record<DeviceKind, (size: number) => ReactNode> = {
  'all-in-one': (size) => <AllInOneIcon size={size} strokeWidth={1.2} />,
  laptop: (size) => <LaptopIcon size={size} strokeWidth={1.2} />,
  smartphone: (size) => <SmartphoneIcon size={size} strokeWidth={1.2} />,
}

const FIELDS_MAX_WIDTH = 560

function sessionCaption(session: ActiveSession): string {
  return `${session.client} · ${session.city}, ${session.country}`
}

export default function DevicesSettingsFields() {
  const [sessions, setSessions] = useState<ActiveSession[]>(
    () => DEMO_ACTIVE_SESSIONS,
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [signOutAllOpen, setSignOutAllOpen] = useState(false)

  const selected = sessions.find((s) => s.id === selectedId) ?? null
  const otherCount = sessions.filter((s) => !s.isCurrent).length

  const signOut = (id: string) =>
    setSessions((prev) => prev.filter((s) => s.id !== id))

  return (
    <VStack
      gap={4}
      hAlign="stretch"
      width="fill"
      style={{ width: '100%', maxWidth: FIELDS_MAX_WIDTH, alignSelf: 'stretch' }}
    >
      <List className="devices-list" density="balanced">
        {sessions.map((session) => (
          <ListItem
            key={session.id}
            itemKey={session.id}
            onClick={() => setSelectedId(session.id)}
            label={session.name}
            description={sessionCaption(session)}
            startContent={
              <Text color="secondary">{DEVICE_ICONS[session.kind](18)}</Text>
            }
            endContent={
              <HStack gap={2} vAlign="center">
                {session.isCurrent ? (
                  <Badge label="This device" variant="neutral" />
                ) : (
                  <Text type="supporting" color="secondary">
                    {formatLastActive(session.lastActiveAt)}
                  </Text>
                )}
                <Icon icon="chevronRight" size="sm" color="secondary" />
              </HStack>
            }
          />
        ))}
      </List>

      {otherCount > 0 ? (
        <VStack hAlign="start">
          <Button
            variant="secondary"
            size="sm"
            label="Sign out all other devices"
            onClick={() => setSignOutAllOpen(true)}
          />
        </VStack>
      ) : (
        <Text type="supporting" color="secondary">
          You're only signed in on this device.
        </Text>
      )}

      <DeviceDetailSheet
        session={selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
        onSignOut={signOut}
      />

      <AlertDialog
        isOpen={signOutAllOpen}
        onOpenChange={setSignOutAllOpen}
        title="Sign out all other devices?"
        description={`${otherCount} ${otherCount === 1 ? 'device' : 'devices'} will need to sign in again.`}
        actionLabel="Sign out all"
        onAction={() => {
          setSessions((prev) => prev.filter((s) => s.isCurrent))
          setSignOutAllOpen(false)
        }}
      />
    </VStack>
  )
}
