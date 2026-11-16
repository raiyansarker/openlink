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
import type { ActiveSession, DeviceKind } from '#/data/demo/active-sessions'
import { ApiError } from '#/lib/api/error'
import { QueryKeys } from '#/lib/api/query'
import { DevicesApi } from '#/lib/devices/api'
import { formatLastActive } from '#/lib/settings/session-time'

const DEVICE_ICONS: Record<DeviceKind, (size: number) => ReactNode> = {
  'all-in-one': (size) => <AllInOneIcon size={size} strokeWidth={1.2} />,
  laptop: (size) => <LaptopIcon size={size} strokeWidth={1.2} />,
  smartphone: (size) => <SmartphoneIcon size={size} strokeWidth={1.2} />,
}

const FIELDS_MAX_WIDTH = 560
const devices = new DevicesApi()

function sessionCaption(session: ActiveSession): string {
  const place = [session.city, session.country].filter(Boolean).join(', ')
  return place ? `${session.client} · ${place}` : session.client
}

export default function DevicesSettingsFields() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: QueryKeys.deviceSessions, queryFn: () => devices.list() })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [signOutAllOpen, setSignOutAllOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = () => queryClient.invalidateQueries({ queryKey: QueryKeys.deviceSessions })
  const signOutOne = useMutation({
    mutationFn: (id: string) => devices.signOut(id),
    onSuccess: () => setSelectedId(null),
    onError: (e) => setError(ApiError.message(e)),
    onSettled: refresh,
  })
  const signOutOthers = useMutation({
    mutationFn: () => devices.signOutOthers(),
    onError: (e) => setError(ApiError.message(e)),
    onSettled: () => {
      setSignOutAllOpen(false)
      void refresh()
    },
  })

  if (query.isPending) return <Spinner size="md" label="Loading your devices…" />
  if (query.isError) {
    return (
      <VStack gap={2} hAlign="start" role="alert">
        <Text>{ApiError.message(query.error, 'Could not load your devices.')}</Text>
        <Button size="sm" variant="secondary" label="Try again" onClick={() => void query.refetch()} />
      </VStack>
    )
  }

  const sessions: ActiveSession[] = query.data
  const selected = sessions.find((s) => s.id === selectedId) ?? null
  const otherCount = sessions.filter((s) => !s.isCurrent).length

  const signOut = (id: string) => {
    setError(null)
    signOutOne.mutate(id)
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

      {error ? (
        <Text type="supporting" weight="medium" role="alert">
          {error}
        </Text>
      ) : null}

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
          setError(null)
          signOutOthers.mutate()
        }}
      />
    </VStack>
  )
}
