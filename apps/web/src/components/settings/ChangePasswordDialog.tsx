import { useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { type } from 'arktype'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'

import { FormFields } from '#/lib/forms/fields'
import { ProfileApi, ProfileError } from '#/lib/profile/api'
import { ProfileRules } from '#/lib/profile/rules'

const ChangePasswordSchema = type({
  current: FormFields.requiredExact('Enter your current password.'),
  next: 'string',
  confirm: 'string',
})

type ChangePasswordDialogProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}

export default function ChangePasswordDialog({ isOpen, onOpenChange, onChanged }: ChangePasswordDialogProps) {
  const form = useForm({
    defaultValues: { current: '', next: '', confirm: '' },
    validators: {
      onSubmit: ChangePasswordSchema,
      onSubmitAsync: async ({ value }) => {
        const problem = ProfileRules.newPassword(value)
        if (problem) return problem
        try {
          await ProfileApi.changePassword(value.current, value.next)
          return undefined
        } catch (e) {
          return e instanceof ProfileError ? e.message : 'Could not change your password.'
        }
      },
    },
    onSubmit: () => {
      onChanged()
      onOpenChange(false)
    },
  })

  useEffect(() => {
    if (isOpen) form.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="form" width={440}>
      <Layout
        header={<DialogHeader title="Change password" onOpenChange={onOpenChange} />}
        content={
          <LayoutContent>
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault()
                event.stopPropagation()
                void form.handleSubmit()
              }}
            >
            <VStack gap={4} hAlign="stretch" width="100%">
              <form.Field name="current">
                {(field) => (
                  <TextInput
                    label="Current password"
                    type="password"
                    value={field.state.value}
                    onChange={field.handleChange}
                    status={FormFields.status(field.state.meta.errors)}
                    autoComplete="current-password"
                    hasAutoFocus
                    width="100%"
                  />
                )}
              </form.Field>
              <form.Field name="next">
                {(field) => (
                  <TextInput
                    label="New password"
                    type="password"
                    value={field.state.value}
                    onChange={field.handleChange}
                    autoComplete="new-password"
                    description={`At least ${ProfileRules.PASSWORD_MIN} characters.`}
                    width="100%"
                  />
                )}
              </form.Field>
              <form.Field name="confirm">
                {(field) => (
                  <TextInput
                    label="Confirm new password"
                    type="password"
                    value={field.state.value}
                    onChange={field.handleChange}
                    autoComplete="new-password"
                    width="100%"
                  />
                )}
              </form.Field>
              <Text type="supporting" color="secondary">
                You stay signed in here. Other devices are signed out.
              </Text>
              <form.Subscribe selector={(state) => FormFields.firstError(state.errors)}>
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
              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <Button
                    variant="primary"
                    size="sm"
                    label="Change password"
                    isLoading={isSubmitting}
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
