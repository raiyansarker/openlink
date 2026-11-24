import { useMutation } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import SettingsSkeleton from '#/components/settings/SettingsSkeleton'
import { Avatar } from '@astryxdesign/core/Avatar'
import { Button } from '@astryxdesign/core/Button'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import { useIsPhone } from '#/hooks/use-is-phone'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import { PlusIcon } from '#/components/icons/IcnMcp'
import { apiErrorMessage } from '#/lib/api/errors'
import type { Role } from '#/lib/api/types'
import { usePeopleMutations, useWorkspacePeople } from '#/hooks/use-members'
import type { Person } from '#/lib/members/people'
import { useOrganization } from '#/contexts/OrganizationContext'
import { usePermissions } from '#/hooks/use-permissions'
import { workspaceMemberRoleLabel } from '#/lib/members/role-label'
import InviteMemberDrawer from './InviteMemberDrawer'
import MemberDetailDrawer from './MemberDetailDrawer'
import { clickableRows } from '#/lib/tables/clickable-rows'
import MemberRowMenu from './MemberRowMenu'

type MemberRow = Person & Record<string, unknown>

function matchesSearch(person: Person, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return person.name.toLowerCase().includes(q) || person.email.toLowerCase().includes(q)
}

export default function WorkspaceMembersPanel() {
  const { activeOrg } = useOrganization()
  const organizationId = activeOrg.id
  // Owners and admins manage people and see pending invites; everyone else gets a read-only list.
  const canManage = usePermissions().canManageMembers
  const query = useWorkspacePeople(organizationId, { includeInvites: canManage })
  const members = query.people
  const mutations = usePeopleMutations(organizationId)
  const [actionError, setActionError] = useState<string | null>(null)
  /**
   * Row actions share one error line. This only wraps them for error handling:
   * each action runs a `usePeopleMutations` mutation, which refreshes the member
   * and invite lists itself, so nothing is invalidated here.
   */
  const action = useMutation({
    mutationFn: (run: () => Promise<unknown>) => run(),
    onMutate: () => setActionError(null),
    onError: (error) => setActionError(apiErrorMessage(error)),
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [detailMember, setDetailMember] = useState<Person | null>(null)
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

  const openMemberDetail = (member: Person) => {
    setDetailMember(member)
  }

  const changeRole = (person: Person, role: Role) => {
    if (role === 'owner' || person.kind !== 'member') return
    action.mutate(async () => {
      await mutations.changeRole.mutateAsync({ params: { organizationId, userId: person.userId }, body: { role } })
      setDetailMember((prev) => (prev?.key === person.key ? { ...prev, role } : prev))
    })
  }

  /** Removes a person, or cancels a pending invite. */
  const removeMember = (person: Person) => {
    action.mutate(async () => {
      if (person.kind === 'invite') {
        await mutations.revokeInvite.mutateAsync({ params: { organizationId, inviteId: person.inviteId } })
      } else {
        await mutations.remove.mutateAsync({ params: { organizationId, userId: person.userId } })
      }
      setDetailMember((prev) => (prev?.key === person.key ? null : prev))
    })
  }

  const resendInvite = (person: Person) => {
    if (person.kind !== 'invite') return
    action.mutate(() => mutations.resendInvite.mutateAsync({ params: { organizationId, inviteId: person.inviteId } }))
  }

  const submitInvite = async (email: string, role: Role) => {
    if (members.some((m) => m.email.toLowerCase() === email)) {
      throw new Error('This email is already in the workspace.')
    }
    if (role === 'owner') return
    try {
      await mutations.invite.mutateAsync({ params: { organizationId }, body: { email, role } })
    } catch (error) {
      throw new Error(apiErrorMessage(error, 'Could not send the invite.'))
    }
  }

  const rows = filteredMembers as MemberRow[]
  // Phones: email drops out of the table (the member sheet shows it) and role
  // narrows, so the row and its actions fit without horizontal scrolling.
  const isPhone = useIsPhone()
  // The whole row opens the member; only the actions menu inside it is separate.
  const rowPlugins = useMemo(
    () => ({ open: clickableRows<MemberRow>(openMemberDetail, (row) => `Open ${row.name}`) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

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

      <VStack className="members-table members-table--clickable-rows" width="100%" hAlign="stretch">
        <Table<MemberRow>
          className="members-table__grid"
          data={rows}
          idKey="key"
          density="balanced"
          dividers="rows"
          textOverflow="wrap"
          plugins={rowPlugins}
          columns={[
          {
            key: 'name',
            header: 'Name',
            width: proportional(1, { minWidth: 140 }),
            renderCell: (row) => (
              <HStack gap={3} vAlign="center">
                <Avatar
                  src={row.image}
                  name={row.name}
                  size={32}
                  tooltip={false}
                />
                <Text weight="semibold" maxLines={1}>
                  {row.name}
                </Text>
              </HStack>
            ),
          },
          ...(isPhone
            ? []
            : ([
                {
                  key: 'email',
                  header: 'Email',
                  width: proportional(1.2, { minWidth: 160 }),
                  renderCell: (row: MemberRow) => (
                    <Text type="supporting" color="secondary" maxLines={1}>
                      {row.email}
                    </Text>
                  ),
                },
              ] as const)),
          {
            key: 'role',
            header: 'Role',
            width: pixel(isPhone ? 96 : 220),
            renderCell: (row) => (
              <Text type="supporting" color="secondary">
                {workspaceMemberRoleLabel(row.role)}
                {row.kind === 'invite' ? ' (Pending)' : ''}
              </Text>
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

      {query.isPending ? <SettingsSkeleton variant="rows" count={4} label="Loading members…" /> : null}
      {query.error ? (
        <VStack gap={2} hAlign="start" role="alert">
          <Text>{apiErrorMessage(query.error, 'Could not load members.')}</Text>
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
