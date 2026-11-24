import { useState, type ReactNode } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Button } from '@astryxdesign/core/Button'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import DeviceLocationMap from '#/components/settings/DeviceLocationMap'
import ResponsiveDetailSheet from '#/components/common/ResponsiveDetailSheet'
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
      {/* Phone: a bottom sheet; desktop: the floating right-side drawer. */}
      <ResponsiveDetailSheet
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        label={shown.name}
        title={shown.name}
        subtitle={shown.isCurrent ? 'This device' : formatLastActive(shown.lastActiveAt)}
        width={420}
        footer={
          shown.isCurrent ? undefined : (
            <HStack hAlign="end" width="100%">
              <Button
                variant="secondary"
                size="sm"
                label="Sign out this device"
                onClick={() => setSignOutOpen(true)}
              />
            </HStack>
          )
        }
        hasFooterDivider
      >
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
      </ResponsiveDetailSheet>

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
