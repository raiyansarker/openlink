import { useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { useOpenSession } from '#/hooks/use-open-session'
import { usePermissions } from '#/hooks/use-permissions'
import type { AssignableRole } from '#/lib/perms/permissions'
import type { Role } from '#/lib/api/types'
import type { Person } from '#/lib/members/people'
import { ASSIGNABLE_WORKSPACE_ROLES } from '#/lib/members/role-help'
import RolePickerField from './RolePickerField'

type ChangeMemberRoleDialogProps = {
  member: Person
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (member: Person, role: Role) => void
}

function defaultAssignableRole(member: Person): AssignableRole {
  if (member.role === 'owner') return 'admin'
  if (ASSIGNABLE_WORKSPACE_ROLES.includes(member.role)) return member.role
  return 'member'
}

export default function ChangeMemberRoleDialog(props: ChangeMemberRoleDialogProps) {
  const session = useOpenSession(props.isOpen, props.member.key)
  return (
    <Dialog
      isOpen={props.isOpen}
      onOpenChange={props.onOpenChange}
      purpose="form"
      width={400}
    >
      <ChangeMemberRoleForm key={session} {...props} />
    </Dialog>
  )
}

function ChangeMemberRoleForm({
  member,
  onOpenChange,
  onConfirm,
}: ChangeMemberRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<AssignableRole>(() =>
    defaultAssignableRole(member),
  )
  // Admins may only offer the roles they can hand out (member, viewer);
  // owners offer every assignable role. The member's current role always stays
  // in the list so the control keeps a valid value.
  const { assignableRoles } = usePermissions()
  const options = Array.from(new Set([...assignableRoles, member.role])).filter(
    (role): role is AssignableRole => role !== 'owner',
  )

  const unchanged = selectedRole === member.role

  const handleSave = () => {
    if (!unchanged) {
      onConfirm(member, selectedRole)
    }
    onOpenChange(false)
  }

  return (
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
              <RolePickerField
                value={selectedRole}
                onChange={setSelectedRole}
                options={options}
              />
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
  )
}
