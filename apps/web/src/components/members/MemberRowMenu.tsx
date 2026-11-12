import { DropdownMenu } from '@astryxdesign/core/DropdownMenu'
import { IconButton } from '@astryxdesign/core/IconButton'
import { MoreHorizontalIcon } from '#/components/icons/IcnMcp'
import type { WorkspaceMember, WorkspaceMemberRole } from '#/data/demo/types'

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
      id: 'admin',
      label: 'Make admin',
      onClick: () => onChangeRole(member.id, 'admin'),
      isDisabled: isOwner || member.role === 'admin',
    },
    {
      id: 'member',
      label: 'Make member',
      onClick: () => onChangeRole(member.id, 'member'),
      isDisabled: isOwner || member.role === 'member',
    },
    {
      id: 'viewer',
      label: 'Make viewer',
      onClick: () => onChangeRole(member.id, 'viewer'),
      isDisabled: isOwner || member.role === 'viewer',
    },
    {
      id: 'remove',
      label: isPending ? 'Cancel invite' : 'Remove member',
      onClick: () => onRemove(member.id),
      isDisabled: isOwner,
    },
  ]

  return (
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
  )
}
