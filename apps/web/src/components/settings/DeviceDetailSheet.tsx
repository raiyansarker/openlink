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
import type { DeviceView } from '#/lib/devices/describe'
import { formatLastActive, formatSessionDate } from '#/lib/settings/session-time'

type DeviceDetailSheetProps = {
  session: DeviceView | null
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
  // Keep the last device on screen while the drawer animates closed.
  const [shown, setShown] = useState(session)
  if (session && session !== shown) setShown(session)

  if (!shown) return null
  const isOpen = session != null
  const place = [shown.city, shown.country].filter(Boolean).join(', ') || 'Unknown location'

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        label={shown.name}
        side="end"
        width={420}
        hasScrim
        padding={FLOATING_END_DRAWER_PADDING}
        style={floatingEndDrawerStyle()}
      >
        <Layout
          header={
            <DrawerHeader
              title={shown.name}
              subtitle={
                shown.isCurrent
                  ? 'This device'
                  : formatLastActive(shown.lastActiveAt)
              }
              onOpenChange={onOpenChange}
            />
          }
          content={
            <LayoutContent>
              <VStack gap={6} hAlign="stretch" width="100%">
                {shown.coordinates ? (
                <VStack gap={2} hAlign="stretch" width="100%">
                    <DeviceLocationMap
                      lat={shown.coordinates.lat}
                      lng={shown.coordinates.lng}
                      label={`Approximate location: ${place}`}
                    />
                    <VStack gap={0.5} hAlign="start" width="100%">
                      <Text type="supporting" color="secondary">
                        Approximate location from the IP address.
                      </Text>
                    </VStack>
                  </VStack>
                ) : null}

                <VStack gap={3} hAlign="stretch" width="100%">
                  <DetailRow label="Location">{place}</DetailRow>
                  <DetailRow label="IP address">{shown.ipAddress}</DetailRow>
                  <DetailRow label="Browser">{shown.client}</DetailRow>
                  <DetailRow label="Operating system">{shown.os}</DetailRow>
                  <DetailRow label="Signed in with">{shown.signInMethod}</DetailRow>
                  <DetailRow label="Signed in">
                    {formatSessionDate(shown.signedInAt)}
                  </DetailRow>
                  <DetailRow label="Last active">
                    {shown.isCurrent
                      ? 'Now'
                      : formatSessionDate(shown.lastActiveAt)}
                  </DetailRow>
                </VStack>
              </VStack>
            </LayoutContent>
          }
          footer={
            shown.isCurrent ? undefined : (
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
        title={`Sign out ${shown.name}?`}
        description="That device will need to sign in again to use OpenLink."
        actionLabel="Sign out"
        onAction={() => {
          onSignOut(shown.id)
          setSignOutOpen(false)
          onOpenChange(false)
        }}
      />
    </>
  )
}
