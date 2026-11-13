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
import type { WorkspaceMember, WorkspaceMemberRole } from '#/data/demo/types'
import {
  ASSIGNABLE_WORKSPACE_ROLES,
  WORKSPACE_MEMBER_ROLE_HELP,
} from '#/lib/members/role-help'
import { workspaceMemberRoleLabel } from '#/lib/members/role-label'

type ChangeMemberRoleDialogProps = {
  member: WorkspaceMember
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (memberId: string, role: WorkspaceMemberRole) => void
}

function defaultAssignableRole(member: WorkspaceMember): WorkspaceMemberRole {
  if (member.role === 'owner') return 'admin'
  if (ASSIGNABLE_WORKSPACE_ROLES.includes(member.role)) return member.role
  return 'member'
}

export default function ChangeMemberRoleDialog({
  member,
  isOpen,
  onOpenChange,
  onConfirm,
}: ChangeMemberRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<WorkspaceMemberRole>(
    defaultAssignableRole(member),
  )

  useEffect(() => {
    if (isOpen) {
      setSelectedRole(defaultAssignableRole(member))
    }
  }, [isOpen, member])

  const unchanged = selectedRole === member.role

  const handleSave = () => {
    if (!unchanged) {
      onConfirm(member.id, selectedRole)
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
                Choose a workspace role for {member.name}.
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
                  {ASSIGNABLE_WORKSPACE_ROLES.map((option) => (
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
