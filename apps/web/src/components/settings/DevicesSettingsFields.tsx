import type { ReactNode } from 'react'
import { VStack } from '@astryxdesign/core/VStack'
import { List, ListItem } from '@astryxdesign/core/List'
import { Badge } from '@astryxdesign/core/Badge'
import { Button } from '@astryxdesign/core/Button'
import {
  AllInOneIcon,
  LaptopIcon,
  SmartphoneIcon,
} from '#/components/icons/IcnMcp'
import {
  DEMO_ACTIVE_SESSIONS,
  type DeviceKind,
} from '#/data/demo/active-sessions'

const DEVICE_ICONS: Record<DeviceKind, (size: number) => ReactNode> = {
  'all-in-one': (size) => <AllInOneIcon size={size} strokeWidth={1.2} />,
  laptop: (size) => <LaptopIcon size={size} strokeWidth={1.2} />,
  smartphone: (size) => <SmartphoneIcon size={size} strokeWidth={1.2} />,
}

export default function DevicesSettingsFields() {
  return (
    <VStack gap={3} hAlign="start" width="fill">
      <List hasDividers edge="flush">
        {DEMO_ACTIVE_SESSIONS.map((session) => (
          <ListItem
            key={session.id}
            itemKey={session.id}
            isSelected={session.isCurrent}
            label={session.name}
            description={`${session.location} · ${session.lastActive}`}
            startContent={
              <span
                style={{
                  display: 'flex',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {DEVICE_ICONS[session.kind](18)}
              </span>
            }
            endContent={
              session.isCurrent ? (
                <Badge label="This device" variant="neutral" />
              ) : (
                <Button
                  variant="subtle"
                  size="sm"
                  label="Sign out"
                  onClick={() => {}}
                />
              )
            }
          />
        ))}
      </List>
      <Button
        variant="subtle"
        size="sm"
        label="Sign out of all other sessions"
        onClick={() => {}}
      />
    </VStack>
  )
}
