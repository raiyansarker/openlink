import { useEffect } from 'react'
import { useForm } from '@tanstack/react-form'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import { submitWith } from '#/lib/forms/fields'

type DeleteWorkspaceDialogProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  workspaceName: string
  linkCount: number
  onDelete: () => void
}

export default function DeleteWorkspaceDialog({
  isOpen,
  onOpenChange,
  workspaceName,
  linkCount,
  onDelete,
}: DeleteWorkspaceDialogProps) {
  const form = useForm({
    defaultValues: { confirmation: '' },
    onSubmit: ({ value }) => {
      if (value.confirmation.trim() !== workspaceName) return
      onDelete()
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
        header={
          <DialogHeader
            title={`Delete ${workspaceName}?`}
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <form noValidate onSubmit={submitWith(form)}>
              <VStack gap={4} hAlign="stretch" width="100%">
                <Text type="supporting" color="secondary">
                  All {linkCount} short links stop redirecting and every member
                  loses access. This cannot be undone.
                </Text>
                <form.Field name="confirmation">
                  {(field) => (
                    <TextInput
                      label={`Type ${workspaceName} to confirm`}
                      value={field.state.value}
                      onChange={field.handleChange}
                      autoComplete="off"
                      hasAutoFocus
                      width="100%"
                    />
                  )}
                </form.Field>
              </VStack>
            </form>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={2} hAlign="end" width="100%">
              <Button
                variant="ghost"
                size="sm"
                label="Cancel"
                onClick={() => onOpenChange(false)}
              />
              <form.Subscribe selector={(state) => state.values.confirmation.trim() === workspaceName}>
                {(isConfirmed) => (
                  <Button
                    variant="destructive"
                    size="sm"
                    label="Delete workspace"
                    isDisabled={!isConfirmed}
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
