import { useEffect, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { Selector } from '@astryxdesign/core/Selector'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import type { WorkspaceMember } from '#/data/demo/types'

type TransferOwnershipDialogProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  workspaceName: string
  candidates: WorkspaceMember[]
  onTransfer: (memberId: string) => void
}

export default function TransferOwnershipDialog({
  isOpen,
  onOpenChange,
  workspaceName,
  candidates,
  onTransfer,
}: TransferOwnershipDialogProps) {
  const [memberId, setMemberId] = useState('')

  useEffect(() => {
    if (isOpen) setMemberId('')
  }, [isOpen])

  const options = candidates.map((member) => ({
    value: member.id,
    label: member.name,
    description: member.email,
  }))

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="form" width={440}>
      <Layout
        header={
          <DialogHeader
            title="Transfer ownership"
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4} hAlign="stretch" width="100%">
              <Text type="supporting" color="secondary">
                The new owner gets billing and full control of {workspaceName}.
                You stay on as an admin.
              </Text>
              {candidates.length === 0 ? (
                <Text type="supporting" color="secondary">
                  Make someone an admin in Members first.
                </Text>
              ) : (
                <Selector
                  label="New owner"
                  options={options}
                  value={memberId}
                  onChange={setMemberId}
                  placeholder="Choose an admin"
                  hasSearch={candidates.length > 8}
                  width="100%"
                />
              )}
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
                variant="primary"
                size="sm"
                label="Transfer"
                isDisabled={!memberId}
                onClick={() => {
                  onTransfer(memberId)
                  onOpenChange(false)
                }}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  )
}
