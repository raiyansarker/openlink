import { useState } from 'react'
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu'
import { IconButton } from '@astryxdesign/core/IconButton'
import { MoreHorizontalIcon } from '#/components/icons/IcnMcp'
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
  const isOwner = member.role === 'owner'
  const isPending = member.kind === 'invite'

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
      onClick: () => onRemove(member),
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
