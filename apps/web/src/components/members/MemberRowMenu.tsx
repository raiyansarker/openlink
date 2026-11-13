import { useState } from 'react'
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu'
import { IconButton } from '@astryxdesign/core/IconButton'
import { MoreHorizontalIcon } from '#/components/icons/IcnMcp'
import type { WorkspaceMember, WorkspaceMemberRole } from '#/data/demo/types'
import ChangeMemberRoleDialog from '#/components/members/ChangeMemberRoleDialog'

type MemberRowMenuProps = {
  member: WorkspaceMember
  onChangeRole: (memberId: string, role: WorkspaceMemberRole) => void
  onResendInvite: (memberId: string) => void
  onRemove: (memberId: string) => void
}

export default function MemberRowMenu({
  member,
  onChangeRole,
  onResendInvite,
  onRemove,
}: MemberRowMenuProps) {
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const isOwner = member.role === 'owner'
  const isPending = member.status === 'pending'

  const items = [
    ...(isPending
      ? [
          {
            id: 'resend',
            label: 'Resend invite',
            onClick: () => onResendInvite(member.id),
          },
        ]
      : []),
    {
      id: 'change-role',
      label: 'Change role',
      onClick: () => setRoleDialogOpen(true),
      isDisabled: isOwner,
    },
    { type: 'divider' as const },
    {
      id: 'remove',
      label: isPending ? 'Cancel invite' : 'Remove member',
      onClick: () => onRemove(member.id),
      isDisabled: isOwner,
    },
  ]

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
      {!isOwner ? (
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
