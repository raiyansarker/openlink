import { useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { type } from 'arktype'
import { Button } from '@astryxdesign/core/Button'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import { SettingsBlock } from '#/components/settings/WorkspaceSettingsParts'
import { useOrganization } from '#/contexts/OrganizationContext'
import { useWorkspaceDirectory } from '#/contexts/WorkspaceDirectoryContext'
import { useNotify } from '#/hooks/use-notify'
import { apiErrorMessage } from '#/lib/api/errors'
import { orpc } from '#/lib/api/orpc'
import { ActiveWorkspace } from '#/lib/dashboard/org-slug'
import { checkedText, fieldStatus, requiredText, submitWith } from '#/lib/forms/fields'
import {
  isValidOrganizationSlug,
  slugifyOrganizationSlug,
} from '#/lib/organization/slugify'

export type WorkspaceDetails = {
  name: string
  slug: string
}

const GeneralSchema = type({
  name: requiredText('Enter a workspace name.'),
  slug: checkedText((slug) => (isValidOrganizationSlug(slug) ? null : 'Use at least 2 lowercase letters, numbers, or dashes.')),
})

/** The name and URL form, starting from `saved` and following it when it changes. */
export function useWorkspaceDetailsForm(saved: WorkspaceDetails) {
  const { activeOrg } = useOrganization()
  const { invalidate: refreshWorkspaces } = useWorkspaceDirectory()
  const notify = useNotify()
  const updateWorkspace = useMutation(orpc.organizations.updateOrganization.mutationOptions({ onSuccess: refreshWorkspaces }))

  const form = useForm({
    defaultValues: saved,
    // Checked as you type, so problems show before saving.
    validators: { onChange: GeneralSchema },
    onSubmit: async ({ value }) => {
      const next = { name: value.name.trim(), slug: value.slug }
      const changes = {
        ...(next.name !== saved.name ? { name: next.name } : {}),
        ...(next.slug !== saved.slug ? { slug: next.slug } : {}),
      }
      try {
        await updateWorkspace.mutateAsync({ params: { organizationId: activeOrg.id }, body: changes })
        if (changes.slug) ActiveWorkspace.remember(changes.slug)
        form.reset(next)
        notify.info('Workspace settings saved.')
      } catch (e) {
        notify.error(apiErrorMessage(e, 'Could not save the workspace.'))
      }
    },
  })

  // Follow the saved values (they change after a save or a refresh).
  useEffect(() => {
    form.reset(saved)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved])

  return form
}

export type WorkspaceDetailsFormApi = ReturnType<typeof useWorkspaceDetailsForm>

type WorkspaceDetailsFieldsProps = {
  form: WorkspaceDetailsFormApi
  saved: WorkspaceDetails
  /** Owners and admins can save. */
  canEdit: boolean
}

/** Name and URL inputs, with Save and Discard once something changed. */
export default function WorkspaceDetailsFields({ form, saved, canEdit }: WorkspaceDetailsFieldsProps) {
  return (
    <form noValidate onSubmit={submitWith(form)}>
      <VStack gap={8} hAlign="stretch" width="100%">
        <SettingsBlock title="Workspace">
          <VStack gap={4} hAlign="stretch" width="100%">
            <form.Field name="name">
              {(field) => (
                <TextInput
                  label="Name"
                  width="100%"
                  value={field.state.value}
                  onChange={field.handleChange}
                  status={fieldStatus(field.state.meta.errors)}
                />
              )}
            </form.Field>
            <form.Field name="slug">
              {(field) => (
                <>
                  <TextInput
                    label="URL"
                    width="100%"
                    value={field.state.value}
                    onChange={(value) => field.handleChange(slugifyOrganizationSlug(value.replace(/\s+/g, '-')))}
                    status={fieldStatus(field.state.meta.errors)}
                  />
                  {field.state.value !== saved.slug && field.state.meta.errors.length === 0 ? (
                    <Text type="supporting" color="secondary">
                      Old bookmarks to /{saved.slug} will stop working.
                    </Text>
                  ) : null}
                </>
              )}
            </form.Field>
          </VStack>
        </SettingsBlock>

        <form.Subscribe
          selector={(state) =>
            [
              state.values.name !== saved.name || state.values.slug !== saved.slug,
              state.isSubmitting,
              state.isValid,
            ] as const
          }
        >
          {([isDirty, isSaving, isValid]) =>
            isDirty ? (
              <HStack gap={2} hAlign="end" width="100%">
                <Button variant="ghost" size="sm" label="Discard" onClick={() => form.reset(saved)} />
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  label="Save changes"
                  isDisabled={!isValid || !canEdit}
                  isLoading={isSaving}
                />
              </HStack>
            ) : null
          }
        </form.Subscribe>
      </VStack>
    </form>
  )
}
