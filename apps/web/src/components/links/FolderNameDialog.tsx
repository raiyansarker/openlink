import { useEffect, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { TextInput } from '@astryxdesign/core/TextInput'
import { FOLDER_DIALOG_PADDING } from '#/components/links/dialog-spacing'

type FolderNameDialogProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** Shown under the title, e.g. where the folder will be created. */
  subtitle?: string
  submitLabel: string
  initialName?: string
  /** Throws an Error with a user-facing message when the name is rejected. */
  onSubmit: (name: string) => void
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
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setName(initialName)
      setError(null)
    }
  }, [isOpen, initialName])

  const submit = () => {
    try {
      onSubmit(name)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

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
              onSubmit={(event) => {
                event.preventDefault()
                submit()
              }}
            >
              <TextInput
                label="Folder name"
                placeholder="e.g. Q4 campaign"
                value={name}
                onChange={(value) => {
                  setName(value)
                  setError(null)
                }}
                status={error ? { type: 'error', message: error } : undefined}
                hasAutoFocus
                isRequired
                width="100%"
              />
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
              <Button
                variant="primary"
                label={submitLabel}
                isDisabled={!name.trim()}
                onClick={submit}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  )
}
