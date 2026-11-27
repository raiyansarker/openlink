import { useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { type } from 'arktype'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { TextInput } from '@astryxdesign/core/TextInput'
import { FOLDER_DIALOG_PADDING } from '#/components/links/dialog-spacing'
import { fieldStatus, requiredText, submitWith } from '#/lib/forms/fields'

const FolderNameSchema = type({ name: requiredText('Enter a folder name.') })

type FolderNameDialogProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** Shown under the title, e.g. where the folder will be created. */
  subtitle?: string
  submitLabel: string
  initialName?: string
  /** Throws an Error with a user-facing message when the name is rejected. */
  onSubmit: (name: string) => void | Promise<void>
}

/** Shared by "New folder" and "Rename". */
export default function FolderNameDialog({
  isOpen,
  onOpenChange,
  title,
  subtitle,
  submitLabel,
  initialName = '',
  onSubmit,
}: FolderNameDialogProps) {
  const form = useForm({
    defaultValues: { name: initialName },
    validators: {
      onSubmit: FolderNameSchema,
      // The caller's own rules (duplicates, length) run here and land on the field.
      onSubmitAsync: async ({ value }) => {
        try {
          await onSubmit(value.name)
          return undefined
        } catch (err) {
          return { fields: { name: err instanceof Error ? err.message : 'Something went wrong.' } }
        }
      },
    },
    onSubmit: () => onOpenChange(false),
  })

  useEffect(() => {
    if (isOpen) form.reset({ name: initialName })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialName])

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      purpose="form"
      width={460}
      padding={FOLDER_DIALOG_PADDING}
    >
      <Layout
        header={
          <DialogHeader
            title={title}
            subtitle={subtitle}
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent padding={FOLDER_DIALOG_PADDING}>
            <form
              noValidate
              onSubmit={submitWith(form)}
            >
              <form.Field name="name">
                {(field) => (
                  <TextInput
                    label="Folder name"
                    placeholder="e.g. Q4 campaign"
                    value={field.state.value}
                    onChange={field.handleChange}
                    status={fieldStatus(field.state.meta.errors)}
                    hasAutoFocus
                    isRequired
                    width="100%"
                  />
                )}
              </form.Field>
            </form>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider padding={FOLDER_DIALOG_PADDING}>
            <HStack gap={2} hAlign="end" width="100%" wrap="wrap">
              <Button
                variant="ghost"
                label="Cancel"
                onClick={() => onOpenChange(false)}
              />
              <form.Subscribe selector={(state) => [state.values.name, state.isSubmitting] as const}>
                {([name, isSubmitting]) => (
                  <Button
                    variant="primary"
                    label={submitLabel}
                    isDisabled={!name.trim()}
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
