import { useEffect, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { API_KEY_ASSIGNABLE_ROLES, type WorkspaceApiKey } from '#/data/demo/api-keys'
import type { WorkspaceMemberRole } from '#/data/demo/types'
import { WORKSPACE_MEMBER_ROLE_HELP } from '#/lib/members/role-help'
import { workspaceMemberRoleLabel } from '#/lib/members/role-label'

type ChangeApiKeyRoleDialogProps = {
  apiKey: WorkspaceApiKey
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (keyId: string, role: WorkspaceMemberRole) => void
}

function defaultAssignableRole(key: WorkspaceApiKey): WorkspaceMemberRole {
  if (API_KEY_ASSIGNABLE_ROLES.includes(key.role)) return key.role
  return 'member'
}

export default function ChangeApiKeyRoleDialog({
  apiKey,
  isOpen,
  onOpenChange,
  onConfirm,
}: ChangeApiKeyRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<WorkspaceMemberRole>(
    defaultAssignableRole(apiKey),
  )

  useEffect(() => {
    if (isOpen) {
      setSelectedRole(defaultAssignableRole(apiKey))
    }
  }, [isOpen, apiKey])

  const unchanged = selectedRole === apiKey.role

  const handleSave = () => {
    if (!unchanged) {
      onConfirm(apiKey.id, selectedRole)
    }
    onOpenChange(false)
  }

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      purpose="form"
      width={400}
    >
      <Layout
        header={
          <DialogHeader title="Change role" onOpenChange={onOpenChange} />
        }
        content={
          <LayoutContent>
            <VStack gap={4} hAlign="stretch" width="100%">
              <Text type="supporting" color="secondary">
                Choose a workspace role for the {apiKey.name} key.
              </Text>
              <VStack gap={2} hAlign="stretch" width="100%">
                <Text weight="semibold">Workspace role</Text>
                <SegmentedControl
                  label="Workspace role"
                  value={selectedRole}
                  onChange={(value) =>
                    setSelectedRole(value as WorkspaceMemberRole)
                  }
                  layout="fill"
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
                  {WORKSPACE_MEMBER_ROLE_HELP[selectedRole]}
                </Text>
              </VStack>
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={2} hAlign="end" width="100%" wrap="wrap">
              <Button
                variant="ghost"
                size="sm"
                label="Cancel"
                onClick={() => onOpenChange(false)}
              />
              <Button
                variant="secondary"
                size="sm"
                label={unchanged ? 'Done' : 'Save role'}
                onClick={handleSave}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  )
}
