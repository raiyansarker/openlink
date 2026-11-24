import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { type } from 'arktype'
import { Button } from '@astryxdesign/core/Button'
import ResponsiveDetailSheet from '#/components/common/ResponsiveDetailSheet'
import { HStack } from '@astryxdesign/core/HStack'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import ApiKeySecretField from '#/components/settings/ApiKeySecretField'
import { ASSIGNABLE_WORKSPACE_ROLES as API_KEY_ASSIGNABLE_ROLES } from '#/lib/members/role-help'
import { useOpenSession } from '#/hooks/use-open-session'
import type { Role } from '#/lib/api/types'
import { WORKSPACE_MEMBER_ROLE_HELP } from '#/lib/members/role-help'
import { workspaceMemberRoleLabel } from '#/lib/members/role-label'
import { fieldStatus, firstError, requiredText, submitWith } from '#/lib/forms/fields'

const ApiKeySchema = type({ name: requiredText('Give the key a name.'), role: "'admin' | 'member' | 'viewer'" })

type CreateApiKeyDrawerProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  /** Creates the key on the server and resolves with its one-time secret. */
  onCreate: (input: { name: string; role: Role }) => Promise<string>
}

export default function CreateApiKeyDrawer(props: CreateApiKeyDrawerProps) {
  const session = useOpenSession(props.isOpen)
  // The form owns the panel: its title and footer depend on reveal mode.
  return <CreateApiKeyForm key={session} {...props} />
}

function CreateApiKeyForm({ isOpen, onOpenChange, onCreate }: CreateApiKeyDrawerProps) {
  const [createdSecret, setCreatedSecret] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { name: '', role: 'member' as Role },
    validators: {
      onSubmit: ApiKeySchema,
      onSubmitAsync: async ({ value }) => {
        try {
          setCreatedSecret(await onCreate({ name: value.name.trim(), role: value.role }))
          return undefined
        } catch (e) {
          return e instanceof Error ? e.message : 'Could not create the key.'
        }
      },
    },
  })

  const revealMode = createdSecret != null

  return (
    // Phone: a bottom sheet; desktop: the floating right-side drawer.
    <ResponsiveDetailSheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      label="Create API key"
      title={revealMode ? 'Save your API key' : 'Create API key'}
      subtitle={
        revealMode
          ? 'This is the only time the full key is shown.'
          : 'Keys authenticate server-side scripts and integrations.'
      }
      width={400}
      purpose="form"
      hasFooterDivider
      footer={
        <HStack gap={2} hAlign="end" width="100%" wrap="wrap">
          {revealMode ? (
            <Button
              variant="primary"
              size="sm"
              label="Done"
              onClick={() => onOpenChange(false)}
            />
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                label="Cancel"
                onClick={() => onOpenChange(false)}
              />
              <form.Subscribe selector={(state) => [firstError(state.errors), state.isSubmitting, state.values.name.trim() !== ''] as const}>
                {([error, isCreating, hasName]) => (
                  <>
                    {error ? (
                      <Text type="supporting" weight="medium" role="alert">
                        {error}
                      </Text>
                    ) : null}
                    <Button
                      variant="primary"
                      size="sm"
                      label="Create key"
                      isDisabled={!hasName}
                      isLoading={isCreating}
                      onClick={() => void form.handleSubmit()}
                    />
                  </>
                )}
              </form.Subscribe>
            </>
          )}
        </HStack>
      }
    >
      <div>
            {revealMode ? (
              <VStack gap={4} hAlign="stretch" width="100%">
                <Text color="secondary" type="supporting">
                  Copy the key and store it somewhere secure. You cannot view it
                  again after you close this panel.
                </Text>
                <ApiKeySecretField value={createdSecret ?? ''} />
              </VStack>
            ) : (
              <form noValidate onSubmit={submitWith(form)}>
                <VStack gap={6} hAlign="stretch" width="100%">
                  <form.Field name="name">
                    {(field) => (
                      <TextInput
                        label="Name"
                        placeholder="e.g. Production"
                        value={field.state.value}
                        onChange={field.handleChange}
                        description="A label to recognize this key later."
                        status={fieldStatus(field.state.meta.errors)}
                        isRequired
                        hasAutoFocus
                        width="100%"
                      />
                    )}
                  </form.Field>
                  <form.Field name="role">
                    {(field) => (
                      <VStack gap={2} hAlign="stretch" width="100%">
                        <Text weight="semibold">Workspace role</Text>
                        <SegmentedControl
                          label="Workspace role"
                          value={field.state.value}
                          onChange={(value) => field.handleChange(value as Role)}
                          layout="fill"
                          size="sm"
                        >
                          {API_KEY_ASSIGNABLE_ROLES.map((option) => (
                            <SegmentedControlItem
                              key={option}
                              value={option}
                              label={workspaceMemberRoleLabel(option)}
                            />
                          ))}
                        </SegmentedControl>
                        <Text type="supporting" color="secondary">
                          {WORKSPACE_MEMBER_ROLE_HELP[field.state.value]}
                        </Text>
                      </VStack>
                    )}
                  </form.Field>
                </VStack>
              </form>
            )}
      </div>
    </ResponsiveDetailSheet>
  )
}
