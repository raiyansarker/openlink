import { useEffect, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'

import { ProfileApi, ProfileError } from '#/lib/profile/api'

type DeleteAccountDialogProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  email: string
  /** Password accounts confirm with their password; others rely on a recent sign-in. */
  hasPassword: boolean
  onDeleted: () => void
}

export default function DeleteAccountDialog({ isOpen, onOpenChange, email, hasPassword, onDeleted }: DeleteAccountDialogProps) {
  const [confirmation, setConfirmation] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setConfirmation('')
    setPassword('')
    setError(null)
  }, [isOpen])

  const isConfirmed =
    confirmation.trim().toLowerCase() === email.toLowerCase() && (!hasPassword || password.length > 0)

  const submit = async () => {
    if (!isConfirmed || isDeleting) return
    setIsDeleting(true)
    setError(null)
    try {
      await ProfileApi.deleteAccount(hasPassword ? password : undefined)
      onDeleted()
    } catch (e) {
      setError(e instanceof ProfileError ? e.message : 'Could not delete your account.')
      setIsDeleting(false)
    }
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="form" width={440}>
      <Layout
        header={<DialogHeader title="Delete your account?" onOpenChange={onOpenChange} />}
        content={
          <LayoutContent>
            <VStack gap={4} hAlign="stretch" width="100%">
              <Text type="supporting" color="secondary">
                Your profile and sign-in methods are removed and you leave every workspace. Links you
                made stay with their workspace. This cannot be undone.
              </Text>
              <TextInput
                label={`Type ${email} to confirm`}
                value={confirmation}
                onChange={setConfirmation}
                autoComplete="off"
                hasAutoFocus
                width="100%"
              />
              {hasPassword ? (
                <TextInput
                  label="Password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  autoComplete="current-password"
                  width="100%"
                />
              ) : null}
              {error ? (
                <Text type="supporting" weight="medium" role="alert">
                  {error}
                </Text>
              ) : null}
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={2} hAlign="end" width="100%">
              <Button variant="ghost" size="sm" label="Cancel" onClick={() => onOpenChange(false)} />
              <Button
                variant="destructive"
                size="sm"
                label="Delete account"
                isDisabled={!isConfirmed}
                isLoading={isDeleting}
                onClick={() => void submit()}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  )
}
