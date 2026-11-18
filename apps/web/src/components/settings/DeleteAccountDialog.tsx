import { useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'

import { AuthSession } from '#/lib/auth/client'
import { authCall } from '#/lib/auth/errors'
import { firstError, submitWith } from '#/lib/forms/fields'

type DeleteAccountDialogProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  email: string
  /** Password accounts confirm with their password; others rely on a recent sign-in. */
  hasPassword: boolean
  onDeleted: () => void
}

export default function DeleteAccountDialog({ isOpen, onOpenChange, email, hasPassword, onDeleted }: DeleteAccountDialogProps) {
  const isConfirmed = (value: { confirmation: string; password: string }) =>
    value.confirmation.trim().toLowerCase() === email.toLowerCase() && (!hasPassword || value.password.length > 0)

  const form = useForm({
    defaultValues: { confirmation: '', password: '' },
    validators: {
      onSubmitAsync: async ({ value }) => {
        if (!isConfirmed(value)) return 'Type your email to confirm.'
        try {
          // Password accounts confirm with their password; others need a recent sign-in.
          await authCall(
            AuthSession.client.deleteUser(hasPassword ? { password: value.password } : {}),
            'Could not delete your account.',
          )
          AuthSession.invalidate()
          return undefined
        } catch (e) {
          return e instanceof Error ? e.message : 'Could not delete your account.'
        }
      },
    },
    onSubmit: onDeleted,
  })

  useEffect(() => {
    if (isOpen) form.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="form" width={440}>
      <Layout
        header={<DialogHeader title="Delete your account?" onOpenChange={onOpenChange} />}
        content={
          <LayoutContent>
            <form noValidate onSubmit={submitWith(form)}>
              <VStack gap={4} hAlign="stretch" width="100%">
                <Text type="supporting" color="secondary">
                  Your profile and sign-in methods are removed and you leave every workspace. Links you
                  made stay with their workspace. This cannot be undone.
                </Text>
                <form.Field name="confirmation">
                  {(field) => (
                    <TextInput
                      label={`Type ${email} to confirm`}
                      value={field.state.value}
                      onChange={field.handleChange}
                      autoComplete="off"
                      hasAutoFocus
                      width="100%"
                    />
                  )}
                </form.Field>
                {hasPassword ? (
                  <form.Field name="password">
                    {(field) => (
                      <TextInput
                        label="Password"
                        type="password"
                        value={field.state.value}
                        onChange={field.handleChange}
                        autoComplete="current-password"
                        width="100%"
                      />
                    )}
                  </form.Field>
                ) : null}
                <form.Subscribe selector={(state) => firstError(state.errors)}>
                  {(error) =>
                    error ? (
                      <Text type="supporting" weight="medium" role="alert">
                        {error}
                      </Text>
                    ) : null
                  }
                </form.Subscribe>
              </VStack>
            </form>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={2} hAlign="end" width="100%">
              <Button variant="ghost" size="sm" label="Cancel" onClick={() => onOpenChange(false)} />
              <form.Subscribe selector={(state) => [state.isSubmitting, isConfirmed(state.values)] as const}>
                {([isDeleting, canDelete]) => (
                  <Button
                    variant="destructive"
                    size="sm"
                    label="Delete account"
                    isDisabled={!canDelete}
                    isLoading={isDeleting}
                    onClick={() => void form.handleSubmit()}
                  />
                )}
              </form.Subscribe>
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  )
}
