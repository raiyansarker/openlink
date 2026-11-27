import { useState } from 'react'
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu'
import { IconButton } from '@astryxdesign/core/IconButton'
import { MoreHorizontalIcon } from '#/components/icons/IcnMcp'
import { usePermissions } from '#/hooks/use-permissions'
import type { Role } from '#/lib/api/types'
import type { Person } from '#/lib/members/people'
import ChangeMemberRoleDialog from '#/components/members/ChangeMemberRoleDialog'

type MemberRowMenuProps = {
  member: Person
  onChangeRole: (member: Person, role: Role) => void
  onResendInvite: (member: Person) => void
  onRemove: (member: Person) => void
}

export default function MemberRowMenu({
  member,
  onChangeRole,
  onResendInvite,
  onRemove,
}: MemberRowMenuProps) {
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const { canManageMember } = usePermissions()
  const isOwner = member.role === 'owner'
  const isPending = member.kind === 'invite'
  // Admins cannot change or remove peers: only the member roles they may manage.
  // Pending invites keep resend and cancel (any admin accepts those at the
  // server); their role changes only by cancelling and re-inviting.
  const canChangeRole = !isPending && !isOwner && canManageMember(member.role)
  const canRemove = isPending || canChangeRole

  const items = [
    ...(isPending
      ? [
          {
            id: 'resend',
            label: 'Resend invite',
            onClick: () => onResendInvite(member),
          },
        ]
      : []),
    ...(canChangeRole
      ? [
          {
            id: 'change-role',
            label: 'Change role',
            onClick: () => setRoleDialogOpen(true),
          },
        ]
      : []),
    ...(canChangeRole || isPending ? [{ type: 'divider' as const }] : []),
    ...(canRemove
      ? [
          {
            id: 'remove',
            label: isPending ? 'Cancel invite' : 'Remove member',
            onClick: () => onRemove(member),
          },
        ]
      : []),
  ]

  // Nothing this member may do with the target (for example an admin viewing a
  // peer admin): no menu at all.
  if (items.length === 0) return null

  return (
    <>
      <DropdownMenu
        hasChevron={false}
        presentation="popover"
        placement="below"
        alignment="end"
        menuWidth={200}
        renderTrigger={(triggerProps) => (
          <IconButton
            {...triggerProps}
            variant="ghost"
            size="sm"
            icon={<MoreHorizontalIcon size={16} />}
            label={`More actions for ${member.name}`}
            tooltip={`Actions for ${member.name}`}
          />
        )}
        items={items}
      />
      {canChangeRole ? (
        <ChangeMemberRoleDialog
          member={member}
          isOpen={roleDialogOpen}
          onOpenChange={setRoleDialogOpen}
          onConfirm={onChangeRole}
        />
      ) : null}
    </>
  )
}
