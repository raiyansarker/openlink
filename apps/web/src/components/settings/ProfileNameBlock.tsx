import { useEffect, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { type } from 'arktype'
import { Button } from '@astryxdesign/core/Button'
import { HStack } from '@astryxdesign/core/HStack'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import { ProfileBlock, Status, type CurrentUser } from '#/components/settings/ProfileParts'
import { useRefreshCurrentUser } from '#/hooks/use-current-user'
import { apiErrorMessage } from '#/lib/api/errors'
import { orpc } from '#/lib/api/orpc'
import { fieldStatus, submitWith } from '#/lib/forms/fields'
import { ProfileRules } from '#/lib/profile/rules'

const ProfileNameSchema = type({
  name: type('string').narrow((value, ctx) => {
    const check = ProfileRules.name(value)
    return check.ok || ctx.reject({ message: check.message })
  }),
})

/** Change the display name. */
export default function ProfileNameBlock({ user }: { user: CurrentUser }) {
  const refresh = useRefreshCurrentUser()
  const updateProfile = useMutation(orpc.account.updateMyProfile.mutationOptions())
  const [nameSaved, setNameSaved] = useState(false)

  const nameForm = useForm({
    defaultValues: { name: user.name },
    validators: {
      onSubmit: ProfileNameSchema,
      onSubmitAsync: async ({ value }) => {
        const check = ProfileRules.name(value.name)
        if (!check.ok) return { fields: { name: check.message } }
        try {
          await updateProfile.mutateAsync({ body: { name: check.value } })
          await refresh()
          setNameSaved(true)
          return undefined
        } catch (e) {
          return { fields: { name: apiErrorMessage(e, 'Could not save your name.') } }
        }
      },
    },
  })

  // Start from the saved name, and follow it if it changes elsewhere.
  useEffect(() => {
    nameForm.reset({ name: user.name })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.name])

  return (
    <ProfileBlock title="Name" description="Shown on your profile and to people in workspaces you join.">
      <form
        style={{ width: '100%' }}
        noValidate
        onSubmit={submitWith(nameForm)}
      >
        <VStack gap={2} hAlign="start" width="100%">
          <nameForm.Field name="name">
            {(field) => (
              <TextInput
                label="Full name"
                size="sm"
                width="100%"
                value={field.state.value}
                onChange={(value) => {
                  setNameSaved(false)
                  field.handleChange(value)
                }}
                autoComplete="name"
                status={fieldStatus(field.state.meta.errors)}
              />
            )}
          </nameForm.Field>
          <nameForm.Subscribe
            selector={(state) => [state.values.name, state.isSubmitting] as const}
          >
            {([name, isSubmitting]) => (
              <HStack gap={3} vAlign="center">
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  label="Save"
                  isDisabled={name.trim().replace(/\s+/g, ' ') === user.name}
                  isLoading={isSubmitting}
                />
                {nameSaved ? <Status message="Saved." tone="info" /> : null}
              </HStack>
            )}
          </nameForm.Subscribe>
        </VStack>
      </form>
    </ProfileBlock>
  )
}
