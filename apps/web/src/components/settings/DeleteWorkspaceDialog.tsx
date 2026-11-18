import { useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'

type DeleteWorkspaceDialogProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  workspaceName: string
  linkCount: number
  onDelete: () => void
}

function DeleteWorkspaceDialogBody({
  onOpenChange,
  workspaceName,
  linkCount,
  onDelete,
}: DeleteWorkspaceDialogProps) {
  const [confirmation, setConfirmation] = useState('')

  const isConfirmed = confirmation.trim() === workspaceName

  return (
    <Layout
      header={
        <DialogHeader
          title={`Delete ${workspaceName}?`}
          onOpenChange={onOpenChange}
        />
      }
      content={
        <LayoutContent>
          <VStack gap={4} hAlign="stretch" width="100%">
            <Text type="supporting" color="secondary">
              All {linkCount} short links stop redirecting and every member
              loses access. This cannot be undone.
            </Text>
            <TextInput
              label={`Type ${workspaceName} to confirm`}
              value={confirmation}
              onChange={setConfirmation}
              autoComplete="off"
              hasAutoFocus
              width="100%"
            />
          </VStack>
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
            <Button
              variant="destructive"
              size="sm"
              label="Delete workspace"
              isDisabled={!isConfirmed}
              onClick={() => {
                onDelete()
                onOpenChange(false)
              }}
            />
          </HStack>
        </LayoutFooter>
      }
    />
  )
}

export default function DeleteWorkspaceDialog(props: DeleteWorkspaceDialogProps) {
  const { onOpenChange } = props
  return (
    <Dialog isOpen={props.isOpen} onOpenChange={onOpenChange} purpose="form" width={440}>
      {props.isOpen ? <DeleteWorkspaceDialogBody {...props} /> : null}
    </Dialog>
  )
}
