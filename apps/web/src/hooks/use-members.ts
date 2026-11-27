import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import { orpc } from '#/lib/api/orpc'
import { toPeople, type Person } from '#/lib/members/people'

const selectItems = <T,>(data: { items: T[] }): T[] => data.items

/**
 * A workspace's members, plus its pending invites for those who manage people
 * (only owners and admins may read invites).
 */
export function useWorkspacePeople(organizationId: string, options: { includeInvites: boolean; enabled?: boolean }) {
  const input = { params: { organizationId } }
  const enabled = options.enabled ?? true
  const members = useQuery(orpc.organizations.listMembers.queryOptions({ input, select: selectItems, enabled }))
  const invites = useQuery(
    orpc.organizations.listOrganizationInvites.queryOptions({
      input,
      select: selectItems,
      enabled: enabled && options.includeInvites,
    }),
  )
  const people = useMemo<Person[]>(
    () => toPeople(members.data ?? [], options.includeInvites ? (invites.data ?? []) : []),
    [members.data, invites.data, options.includeInvites],
  )
  return {
    people,
    isPending: members.isPending || (options.includeInvites && invites.isPending),
    isSuccess: members.isSuccess,
    error: members.error ?? invites.error,
    refetch: () => Promise.all([members.refetch(), options.includeInvites ? invites.refetch() : null]),
  }
}

/** Every change to people refreshes the member and invite lists. */
export function usePeopleMutations(organizationId: string) {
  const queryClient = useQueryClient()
  const input = { params: { organizationId } }
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: orpc.organizations.listMembers.queryKey({ input }) }),
      queryClient.invalidateQueries({ queryKey: orpc.organizations.listOrganizationInvites.queryKey({ input }) }),
    ])
  const refreshWithWorkspaces = () =>
    Promise.all([refresh(), queryClient.invalidateQueries({ queryKey: orpc.organizations.listOrganizations.queryKey() })])

  return {
    invite: useMutation(orpc.organizations.createOrganizationInvite.mutationOptions({ onSuccess: refresh })),
    changeRole: useMutation(orpc.organizations.updateMemberRole.mutationOptions({ onSuccess: refresh })),
    remove: useMutation(orpc.organizations.removeMember.mutationOptions({ onSuccess: refresh })),
    revokeInvite: useMutation(orpc.organizations.revokeOrganizationInvite.mutationOptions({ onSuccess: refresh })),
    resendInvite: useMutation(orpc.organizations.resendOrganizationInvite.mutationOptions({ onSuccess: refresh })),
    // Your own role changes too, so the workspace list is re-read.
    transferOwnership: useMutation(orpc.organizations.transferOwnership.mutationOptions({ onSuccess: refreshWithWorkspaces })),
  }
}
