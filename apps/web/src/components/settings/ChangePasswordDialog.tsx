import { useEffect, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'

import { ProfileApi, ProfileError } from '#/lib/profile/api'
import { ProfileRules } from '#/lib/profile/rules'

type ChangePasswordDialogProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}

export default function ChangePasswordDialog({ isOpen, onOpenChange, onChanged }: ChangePasswordDialogProps) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setCurrent('')
    setNext('')
    setConfirm('')
    setError(null)
  }, [isOpen])

  const submit = async () => {
    if (isSaving) return
    const problem = current ? ProfileRules.newPassword({ current, next, confirm }) : 'Enter your current password.'
    if (problem) {
      setError(problem)
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      await ProfileApi.changePassword(current, next)
      onChanged()
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof ProfileError ? e.message : 'Could not change your password.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="form" width={440}>
      <Layout
        header={<DialogHeader title="Change password" onOpenChange={onOpenChange} />}
        content={
          <LayoutContent>
            <VStack gap={4} hAlign="stretch" width="100%">
              <TextInput
                label="Current password"
                type="password"
                value={current}
                onChange={setCurrent}
                autoComplete="current-password"
                hasAutoFocus
                width="100%"
              />
              <TextInput
                label="New password"
                type="password"
                value={next}
                onChange={setNext}
                autoComplete="new-password"
                description={`At least ${ProfileRules.PASSWORD_MIN} characters.`}
                width="100%"
              />
              <TextInput
                label="Confirm new password"
                type="password"
                value={confirm}
                onChange={setConfirm}
                autoComplete="new-password"
                width="100%"
              />
              <Text type="supporting" color="secondary">
                You stay signed in here. Other devices are signed out.
              </Text>
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
              <Button variant="primary" size="sm" label="Change password" isLoading={isSaving} onClick={() => void submit()} />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  )
}
