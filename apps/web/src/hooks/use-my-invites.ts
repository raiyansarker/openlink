import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { orpc } from '#/lib/api/orpc'
import type { MyInvite } from '#/lib/api/types'

/** New invites show up without a reload: polled every minute and on tab focus. */
const INBOX_REFRESH_MS = 60_000

const selectItems = (data: { items: MyInvite[] }) => data.items
const inboxKey = () => orpc.account.listMyInvites.queryKey()

/** Invites addressed to you, across every workspace. */
export function useMyInvites() {
  return useQuery(
    orpc.account.listMyInvites.queryOptions({
      select: selectItems,
      refetchInterval: INBOX_REFRESH_MS,
      refetchOnWindowFocus: true,
    }),
  )
}

/** Accept or decline; the row leaves the inbox at once and comes back if the server refuses. */
export function useAnswerInvite() {
  const queryClient = useQueryClient()
  const removeFromInbox = async ({ params }: { params: { inviteId: string } }) => {
    await queryClient.cancelQueries({ queryKey: inboxKey() })
    const before = queryClient.getQueryData(inboxKey())
    queryClient.setQueryData(inboxKey(), (current) =>
      current ? { ...current, items: current.items.filter((i) => i.id !== params.inviteId) } : current,
    )
    return { restore: () => queryClient.setQueryData(inboxKey(), before) }
  }

  const accept = useMutation(
    orpc.account.acceptMyInvite.mutationOptions({
      onMutate: removeFromInbox,
      onError: (_error, _input, context) => context?.restore(),
      // The new workspace joins the switcher.
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.organizations.listOrganizations.queryKey() }),
      onSettled: () => queryClient.invalidateQueries({ queryKey: inboxKey() }),
    }),
  )
  const decline = useMutation(
    orpc.account.declineMyInvite.mutationOptions({
      onMutate: removeFromInbox,
      onError: (_error, _input, context) => context?.restore(),
      onSettled: () => queryClient.invalidateQueries({ queryKey: inboxKey() }),
    }),
  )
  return { accept, decline }
}
