import { useState, type ReactNode } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Button } from '@astryxdesign/core/Button'
import { Drawer, DrawerHeader } from '@astryxdesign/core/Drawer'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import DeviceLocationMap from '#/components/settings/DeviceLocationMap'
import {
  FLOATING_END_DRAWER_PADDING,
  floatingEndDrawerStyle,
} from '#/components/members/floating-end-drawer'
import type { ActiveSession } from '#/data/demo/active-sessions'
import { formatLastActive, formatSessionDate } from '#/lib/settings/session-time'

type DeviceDetailSheetProps = {
  session: ActiveSession | null
  onOpenChange: (open: boolean) => void
  onSignOut: (sessionId: string) => void
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <HStack hAlign="between" vAlign="center" gap={4} width="100%">
      <Text type="supporting" color="secondary">
        {label}
      </Text>
      <Text type="supporting" style={{ textAlign: 'end' }}>
        {children}
      </Text>
    </HStack>
  )
}

export default function DeviceDetailSheet({
  session,
  onOpenChange,
  onSignOut,
}: DeviceDetailSheetProps) {
  const [signOutOpen, setSignOutOpen] = useState(false)

  if (!session) return null

  const place = `${session.city}, ${session.country}`

  return (
    <>
      <Drawer
        isOpen
        onOpenChange={onOpenChange}
        label={session.name}
        side="end"
        width={420}
        hasScrim
        padding={FLOATING_END_DRAWER_PADDING}
        style={floatingEndDrawerStyle()}
      >
        <Layout
          header={
            <DrawerHeader
              title={session.name}
              subtitle={
                session.isCurrent
                  ? 'This device'
                  : formatLastActive(session.lastActiveAt)
              }
              onOpenChange={onOpenChange}
            />
          }
          content={
            <LayoutContent>
              <VStack gap={6} hAlign="stretch" width="100%">
                <VStack gap={2} hAlign="stretch" width="100%">
                  <DeviceLocationMap
                    lat={session.coordinates.lat}
                    lng={session.coordinates.lng}
                    label={`Approximate location: ${place}`}
                  />
                  <VStack gap={0.5} hAlign="start" width="100%">
                    <Text type="supporting" color="secondary">
                      Approximate location from the IP address.
                    </Text>
                    <Text type="supporting" color="secondary">
                      © OpenFreeMap · OpenMapTiles · OpenStreetMap contributors
                    </Text>
                  </VStack>
                </VStack>

                <VStack gap={3} hAlign="stretch" width="100%">
                  <DetailRow label="Location">{place}</DetailRow>
                  <DetailRow label="IP address">{session.ipAddress}</DetailRow>
                  <DetailRow label="Browser">{session.client}</DetailRow>
                  <DetailRow label="Operating system">{session.os}</DetailRow>
                  <DetailRow label="Signed in with">{session.signInMethod}</DetailRow>
                  <DetailRow label="Signed in">
                    {formatSessionDate(session.signedInAt)}
                  </DetailRow>
                  <DetailRow label="Last active">
                    {session.isCurrent
                      ? 'Now'
                      : formatSessionDate(session.lastActiveAt)}
                  </DetailRow>
                </VStack>
              </VStack>
            </LayoutContent>
          }
          footer={
            session.isCurrent ? undefined : (
              <LayoutFooter hasDivider>
                <HStack hAlign="end" width="100%">
                  <Button
                    variant="secondary"
                    size="sm"
                    label="Sign out this device"
                    onClick={() => setSignOutOpen(true)}
                  />
                </HStack>
              </LayoutFooter>
            )
          }
        />
      </Drawer>

      <AlertDialog
        isOpen={signOutOpen}
        onOpenChange={setSignOutOpen}
        title={`Sign out ${session.name}?`}
        description="That device will need to sign in again to use OpenLink."
        actionLabel="Sign out"
        onAction={() => {
          onSignOut(session.id)
          setSignOutOpen(false)
          onOpenChange(false)
        }}
      />
    </>
  )
}
