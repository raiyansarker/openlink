import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Spinner } from '@astryxdesign/core/Spinner'
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
import { apiErrorMessage } from '#/lib/api/errors'
import { orpc } from '#/lib/api/orpc'
import { useNotify } from '#/hooks/use-notify'
import { describeDeviceSession, type DeviceView } from '#/lib/devices/describe'
import type { DeviceKind } from '#/lib/devices/user-agent'
import { formatLastActive } from '#/lib/settings/session-time'

const DEVICE_ICONS: Record<DeviceKind, (size: number) => ReactNode> = {
  'all-in-one': (size) => <AllInOneIcon size={size} strokeWidth={1.2} />,
  laptop: (size) => <LaptopIcon size={size} strokeWidth={1.2} />,
  smartphone: (size) => <SmartphoneIcon size={size} strokeWidth={1.2} />,
}

const FIELDS_MAX_WIDTH = 560

/** Module-level so `select` stays stable. */
const toDeviceViews = (data: { items: Parameters<typeof describeDeviceSession>[0][] }) => data.items.map(describeDeviceSession)

function sessionCaption(session: DeviceView): string {
  const place = [session.city, session.country].filter(Boolean).join(', ')
  return place ? `${session.client} · ${place}` : session.client
}

export default function DevicesSettingsFields() {
  const queryClient = useQueryClient()
  const query = useQuery(orpc.account.listDeviceSessions.queryOptions({ select: toDeviceViews }))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [signOutAllOpen, setSignOutAllOpen] = useState(false)
  const notify = useNotify()

  const refresh = () => queryClient.invalidateQueries({ queryKey: orpc.account.listDeviceSessions.queryKey() })
  const signOutOne = useMutation(
    orpc.account.revokeDeviceSession.mutationOptions({
      onSuccess: () => setSelectedId(null),
      onError: (e) => notify.error(apiErrorMessage(e, 'Could not sign out that device.')),
      onSettled: refresh,
    }),
  )
  const signOutOthers = useMutation(
    orpc.account.revokeOtherDeviceSessions.mutationOptions({
      onError: (e) => notify.error(apiErrorMessage(e, 'Could not sign out your other devices.')),
      onSettled: () => {
        setSignOutAllOpen(false)
        void refresh()
      },
    }),
  )

  if (query.isPending) return <Spinner size="md" label="Loading your devices…" />
  if (query.isError) {
    return (
      <VStack gap={2} hAlign="start" role="alert">
        <Text>{apiErrorMessage(query.error, 'Could not load your devices.')}</Text>
        <Button size="sm" variant="secondary" label="Try again" onClick={() => void query.refetch()} />
      </VStack>
    )
  }

  const sessions: DeviceView[] = query.data
  const selected = sessions.find((s) => s.id === selectedId) ?? null
  const otherCount = sessions.filter((s) => !s.isCurrent).length

  const signOut = (id: string) => {
    signOutOne.mutate({ params: { sessionId: id } })
  }

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
                signOutOthers.mutate()
        }}
      />
    </VStack>
  )
}
