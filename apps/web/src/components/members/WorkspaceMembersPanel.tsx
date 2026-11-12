import { useEffect, useMemo, useState } from 'react'
import { Avatar } from '@astryxdesign/core/Avatar'
import { Button } from '@astryxdesign/core/Button'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import { PlusIcon } from '#/components/icons/IcnMcp'
import { getMembersForOrg } from '#/data/demo/queries'
import type { WorkspaceMember, WorkspaceMemberRole } from '#/data/demo/types'
import { useOrganization } from '#/contexts/OrganizationContext'
import { withDemoMemberAvatar } from '#/lib/members/demo-avatar'
import { workspaceMemberRoleLabel } from '#/lib/members/role-label'
import InviteMemberDrawer from './InviteMemberDrawer'
import MemberDetailDrawer from './MemberDetailDrawer'
import MemberRowMenu from './MemberRowMenu'
import MemberTableRowButton from './MemberTableRowButton'

type MemberRow = WorkspaceMember & Record<string, unknown>

function matchesSearch(member: WorkspaceMember, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    member.name.toLowerCase().includes(q) ||
    member.email.toLowerCase().includes(q)
  )
}

function nameFromEmail(email: string): string {
  const local = email.split('@')[0]?.replace(/[.+_-]/g, ' ') ?? 'Teammate'
  return local
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function WorkspaceMembersPanel() {
  const { activeOrg } = useOrganization()
  const [members, setMembers] = useState<WorkspaceMember[]>(() =>
    getMembersForOrg(activeOrg.id),
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [detailMember, setDetailMember] = useState<WorkspaceMember | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<WorkspaceMemberRole>('member')
  const [inviteError, setInviteError] = useState<string | null>(null)

  useEffect(() => {
    setMembers(getMembersForOrg(activeOrg.id))
    setSearchQuery('')
    setDetailMember(null)
    setInviteEmail('')
    setInviteError(null)
  }, [activeOrg.id])

  const filteredMembers = useMemo(
    () => members.filter((member) => matchesSearch(member, searchQuery)),
    [members, searchQuery],
  )

  const openInvite = () => {
    setInviteRole('member')
    setInviteEmail('')
    setInviteError(null)
    setInviteOpen(true)
  }

  const openMemberDetail = (member: WorkspaceMember) => {
    setDetailMember(member)
  }

  const updateMember = (
    memberId: string,
    patch: Partial<WorkspaceMember>,
  ) => {
    setMembers((prev) =>
      prev.map((member) =>
        member.id === memberId ? { ...member, ...patch } : member,
      ),
    )
    if (detailMember?.id === memberId) {
      setDetailMember((prev) => (prev ? { ...prev, ...patch } : prev))
    }
  }

  const removeMember = (memberId: string) => {
    setMembers((prev) => prev.filter((member) => member.id !== memberId))
    if (detailMember?.id === memberId) setDetailMember(null)
  }

  const submitInvite = () => {
    const email = inviteEmail.trim().toLowerCase()
    if (!email) {
      setInviteError('Enter an email address.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError('Enter a valid email address.')
      return
    }
    if (members.some((m) => m.email.toLowerCase() === email)) {
      setInviteError('This email is already in the workspace.')
      return
    }

    const invited = withDemoMemberAvatar({
      id: `mbr_invite_${Date.now()}`,
      orgId: activeOrg.id,
      name: nameFromEmail(email),
      email,
      role: inviteRole,
      status: 'pending',
      joinedAt: new Date().toISOString(),
    })

    setMembers((prev) => [invited, ...prev])
    setInviteOpen(false)
    setInviteEmail('')
    setInviteError(null)
  }

  const rows = filteredMembers as MemberRow[]

  return (
    <VStack gap={5} hAlign="stretch" width="100%">
      <HStack
        hAlign="between"
        vAlign="center"
        gap={4}
        width="100%"
        wrap="wrap"
      >
        <Heading level={1}>Manage members</Heading>
        <Button
          variant="secondary"
          size="sm"
          label="Invite people"
          icon={<PlusIcon size={14} style={{ display: 'flex' }} />}
          onClick={openInvite}
        />
      </HStack>

      <TextInput
        label="Search team members"
        width="100%"
        placeholder="Search by name or email"
        value={searchQuery}
        onChange={setSearchQuery}
      />

      <VStack className="members-table" width="100%" hAlign="stretch">
        <Table<MemberRow>
          className="members-table__grid"
          data={rows}
          idKey="id"
          density="balanced"
          dividers="rows"
          textOverflow="wrap"
          columns={[
          {
            key: 'name',
            header: 'Name',
            width: proportional(1, { minWidth: 140 }),
            renderCell: (row) => (
              <MemberTableRowButton member={row} onOpen={openMemberDetail}>
                <Avatar
                  src={row.avatarUrl}
                  name={row.name}
                  size={32}
                  tooltip={false}
                />
                <Text weight="semibold" maxLines={1}>
                  {row.name}
                </Text>
              </MemberTableRowButton>
            ),
          },
          {
            key: 'email',
            header: 'Email',
            width: proportional(1.2, { minWidth: 160 }),
            renderCell: (row) => (
              <MemberTableRowButton member={row} onOpen={openMemberDetail}>
                <Text type="supporting" color="secondary" maxLines={1}>
                  {row.email}
                </Text>
              </MemberTableRowButton>
            ),
          },
          {
            key: 'role',
            header: 'Role',
            width: pixel(220),
            renderCell: (row) => (
              <MemberTableRowButton member={row} onOpen={openMemberDetail}>
                <Text type="supporting" color="secondary">
                  {workspaceMemberRoleLabel(row.role)}
                  {row.status === 'pending' ? ' (Pending)' : ''}
                </Text>
              </MemberTableRowButton>
            ),
          },
          {
            key: 'actions',
            header: '',
            width: pixel(56),
            align: 'end',
            renderCell: (row) => (
              <MemberRowMenu
                member={row}
                onChangeRole={(id, role) => updateMember(id, { role })}
                onResendInvite={() => undefined}
                onRemove={removeMember}
              />
            ),
          },
        ]}
        />
      </VStack>

      {rows.length === 0 ? (
        <Text type="supporting" color="secondary">
          No members match your search.
        </Text>
      ) : null}

      <MemberDetailDrawer
        member={detailMember}
        onOpenChange={(open) => {
          if (!open) setDetailMember(null)
        }}
        onChangeRole={(id, role) => updateMember(id, { role })}
        onRemove={removeMember}
        onResendInvite={() => undefined}
      />

      <InviteMemberDrawer
        isOpen={inviteOpen}
        onOpenChange={setInviteOpen}
        workspaceName={activeOrg.name}
        email={inviteEmail}
        onEmailChange={setInviteEmail}
        role={inviteRole}
        onRoleChange={setInviteRole}
        error={inviteError}
        onSubmit={submitInvite}
      />
    </VStack>
  )
}
