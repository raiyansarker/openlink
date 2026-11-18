import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Spinner } from '@astryxdesign/core/Spinner'
import { Avatar } from '@astryxdesign/core/Avatar'
import { Button } from '@astryxdesign/core/Button'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import { PlusIcon } from '#/components/icons/IcnMcp'
import { ApiError } from '#/lib/api/error'
import { WorkspaceMembersApi, type AssignableRole } from '#/lib/api/members'
import { QueryKeys } from '#/lib/api/query'
import type { WorkspaceMember, WorkspaceMemberRole } from '#/data/demo/types'
import { useOrganization } from '#/contexts/OrganizationContext'
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

const membersApi = new WorkspaceMembersApi()

export default function WorkspaceMembersPanel() {
  const { activeOrg } = useOrganization()
  const queryClient = useQueryClient()
  // Owners and admins manage people and see pending invites; everyone else gets a read-only list.
  const canManage = activeOrg.role === 'owner' || activeOrg.role === 'admin'
  const query = useQuery({
    queryKey: [...QueryKeys.members(activeOrg.id), canManage],
    queryFn: () => membersApi.list(activeOrg.id, { includeInvites: canManage }),
  })
  const members = query.data ?? []
  const [actionError, setActionError] = useState<string | null>(null)
  const action = useMutation({
    mutationFn: (run: () => Promise<void>) => run(),
    onMutate: () => setActionError(null),
    onError: (error) => setActionError(ApiError.message(error)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: QueryKeys.members(activeOrg.id) }),
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [detailMember, setDetailMember] = useState<WorkspaceMember | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)

  useEffect(() => {
    setSearchQuery('')
    setDetailMember(null)
  }, [activeOrg.id])

  const filteredMembers = useMemo(
    () => members.filter((member) => matchesSearch(member, searchQuery)),
    [members, searchQuery],
  )

  const openInvite = () => {
    setInviteOpen(true)
  }

  const openMemberDetail = (member: WorkspaceMember) => {
    setDetailMember(member)
  }

  const changeRole = (memberId: string, role: WorkspaceMemberRole) => {
    if (role === 'owner') return
    action.mutate(async () => {
      await membersApi.changeRole(activeOrg.id, memberId, role)
      setDetailMember((prev) => (prev?.id === memberId ? { ...prev, role } : prev))
    })
  }

  const removeMember = (memberId: string) => {
    action.mutate(async () => {
      await membersApi.remove(activeOrg.id, memberId)
      setDetailMember((prev) => (prev?.id === memberId ? null : prev))
    })
  }

  const resendInvite = (memberId: string) => action.mutate(() => membersApi.resendInvite(activeOrg.id, memberId))

  const submitInvite = async (email: string, role: WorkspaceMemberRole) => {
    if (members.some((m) => m.email.toLowerCase() === email)) {
      throw new Error('This email is already in the workspace.')
    }
    if (role === 'owner') return
    const assignable: AssignableRole = role
    try {
      await membersApi.invite(activeOrg.id, email, assignable)
    } catch (error) {
      throw new Error(ApiError.message(error, 'Could not send the invite.'))
    }
    await queryClient.invalidateQueries({ queryKey: QueryKeys.members(activeOrg.id) })
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
        {canManage ? (
          <Button
            variant="secondary"
            size="sm"
            label="Invite people"
            icon={<PlusIcon size={14} style={{ display: 'flex' }} />}
            onClick={openInvite}
          />
        ) : null}
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
              canManage ? <MemberRowMenu
                member={row}
                onChangeRole={changeRole}
                onResendInvite={resendInvite}
                onRemove={removeMember}
              /> : null
            ),
          },
        ]}
        />
      </VStack>

      {query.isPending ? <Spinner size="md" label="Loading members…" /> : null}
      {query.isError ? (
        <VStack gap={2} hAlign="start" role="alert">
          <Text>{ApiError.message(query.error, 'Could not load members.')}</Text>
          <Button size="sm" variant="secondary" label="Try again" onClick={() => void query.refetch()} />
        </VStack>
      ) : null}
      {actionError ? (
        <Text type="supporting" weight="medium" role="alert">
          {actionError}
        </Text>
      ) : null}

      {query.isSuccess && rows.length === 0 ? (
        <Text type="supporting" color="secondary">
          No members match your search.
        </Text>
      ) : null}

      <MemberDetailDrawer
        member={detailMember}
        onOpenChange={(open) => {
          if (!open) setDetailMember(null)
        }}
        onChangeRole={changeRole}
        onRemove={removeMember}
        onResendInvite={resendInvite}
      />

      <InviteMemberDrawer
        isOpen={inviteOpen}
        onOpenChange={setInviteOpen}
        workspaceName={activeOrg.name}
        onSubmit={submitInvite}
      />
    </VStack>
  )
}
