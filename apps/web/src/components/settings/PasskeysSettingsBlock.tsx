import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { HStack } from '@astryxdesign/core/HStack'
import { Item } from '@astryxdesign/core/Item'
import { List } from '@astryxdesign/core/List'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { AuthSession } from '#/lib/auth/client'
import { AuthErrorMessages } from '#/lib/auth/error-messages'
import { QueryKeys } from '#/lib/api/query'

type Passkey = { id: string; name?: string | null; createdAt?: string | Date | null; deviceType?: string; backedUp?: boolean }

/** The signed-in person's passkeys, through Better Auth's passkey plugin. */
class PasskeysApi {
  static async list(): Promise<Passkey[]> {
    const { data, error } = await AuthSession.client.passkey.listUserPasskeys()
    if (error) throw new Error('Could not load your passkeys.')
    return (data ?? []) as Passkey[]
  }

  /** Opens the browser's passkey prompt. Resolves to null when the person cancels it. */
  static async add(): Promise<'added' | null> {
    const result = await AuthSession.client.passkey.addPasskey()
    if (result?.error) {
      const message = AuthErrorMessages.passkey(result.error)
      if (message === null) return null
      throw new Error(message.replace('sign-in', 'setup'))
    }
    return 'added'
  }

  static async remove(id: string): Promise<void> {
    const { error } = await AuthSession.client.passkey.deletePasskey({ id })
    if (error) throw new Error('Could not remove the passkey.')
  }

  static label(passkey: Passkey): string {
    return passkey.name?.trim() || 'Passkey'
  }

  static detail(passkey: Passkey): string {
    const parts = [
      passkey.createdAt
        ? `Added ${new Date(passkey.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
        : null,
      passkey.backedUp ? 'Synced across your devices' : passkey.deviceType === 'singleDevice' ? 'On this device only' : null,
    ]
    return parts.filter(Boolean).join(' · ')
  }
}

/**
 * Passkeys let people sign in with Face ID, Touch ID, Windows Hello or a
 * security key instead of a password.
 */
export default function PasskeysSettingsBlock() {
  const queryClient = useQueryClient()
  const [isSupported, setIsSupported] = useState(true)
  const [message, setMessage] = useState<{ text: string; tone: 'error' | 'info' } | null>(null)
  const [removing, setRemoving] = useState<Passkey | null>(null)

  useEffect(() => setIsSupported(typeof window.PublicKeyCredential === 'function'), [])

  const passkeys = useQuery({ queryKey: QueryKeys.passkeys, queryFn: PasskeysApi.list })
  const refresh = () => queryClient.invalidateQueries({ queryKey: QueryKeys.passkeys })

  const add = useMutation({
    mutationFn: PasskeysApi.add,
    onSuccess: (outcome) => {
      if (outcome === 'added') setMessage({ text: 'Passkey added. You can use it next time you sign in.', tone: 'info' })
    },
    onError: (error) => setMessage({ text: error instanceof Error ? error.message : 'Could not add the passkey.', tone: 'error' }),
    onSettled: refresh,
  })
  const remove = useMutation({
    mutationFn: (passkey: Passkey) => PasskeysApi.remove(passkey.id),
    onSuccess: () => setMessage({ text: 'Passkey removed.', tone: 'info' }),
    onError: (error) => setMessage({ text: error instanceof Error ? error.message : 'Could not remove the passkey.', tone: 'error' }),
    onSettled: refresh,
  })

  const items = passkeys.data ?? []

  return (
    // Same width as the fields above it.
    <VStack gap={3} hAlign="stretch" width="100%" style={{ maxWidth: 560 }}>
      {items.length > 0 ? (
        <Card padding={0}>
        <List hasDividers>
          {items.map((passkey) => (
            <Item
              key={passkey.id}
              label={PasskeysApi.label(passkey)}
              description={PasskeysApi.detail(passkey) || undefined}
              endContent={
                <Button
                  variant="ghost"
                  size="sm"
                  label="Remove"
                  isDisabled={remove.isPending}
                  onClick={() => setRemoving(passkey)}
                />
              }
            />
          ))}
        </List>
        </Card>
      ) : null}
      <HStack gap={3} vAlign="center" wrap="wrap">
        <Button
          variant="secondary"
          size="sm"
          label={items.length > 0 ? 'Add another passkey' : 'Add a passkey'}
          isLoading={add.isPending}
          isDisabled={!isSupported}
          onClick={() => {
            setMessage(null)
            add.mutate()
          }}
        />
        {!isSupported ? (
          <Text type="supporting" color="secondary">
            This browser does not support passkeys.
          </Text>
        ) : null}
      </HStack>
      {passkeys.isError ? (
        <Text type="supporting" role="alert">
          Could not load your passkeys.
        </Text>
      ) : message ? (
        <Text type="supporting" color={message.tone === 'info' ? 'secondary' : undefined} role={message.tone === 'error' ? 'alert' : 'status'}>
          {message.text}
        </Text>
      ) : null}

      <AlertDialog
        isOpen={removing != null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null)
        }}
        title={`Remove ${removing ? PasskeysApi.label(removing) : 'this passkey'}?`}
        description="You will not be able to sign in with it any more. Your other sign-in methods keep working."
        actionLabel="Remove passkey"
        actionVariant="destructive"
        onAction={() => {
          if (removing) remove.mutate(removing)
          setRemoving(null)
        }}
      />
    </VStack>
  )
}
