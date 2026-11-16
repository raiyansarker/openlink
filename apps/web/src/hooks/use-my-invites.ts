import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { MyInvitesApi, type MyInvite } from '#/lib/api/my-invites'
import { QueryKeys } from '#/lib/api/query'

const api = new MyInvitesApi()

/** New invites show up without a reload: polled every minute and on tab focus. */
const INBOX_REFRESH_MS = 60_000

/** Invites addressed to you, across every workspace. */
export function useMyInvites() {
  return useQuery({
    queryKey: QueryKeys.myInvites,
    queryFn: () => api.list(),
    refetchInterval: INBOX_REFRESH_MS,
    refetchOnWindowFocus: true,
  })
}

/** Accept or decline; the row leaves the inbox at once and comes back if the server refuses. */
export function useAnswerInvite() {
  const queryClient = useQueryClient()
  const removeFromInbox = async (inviteId: string) => {
    await queryClient.cancelQueries({ queryKey: QueryKeys.myInvites })
    const before = queryClient.getQueryData<MyInvite[]>(QueryKeys.myInvites)
    queryClient.setQueryData<MyInvite[]>(QueryKeys.myInvites, (current) => (current ?? []).filter((i) => i.id !== inviteId))
    return { restore: () => queryClient.setQueryData(QueryKeys.myInvites, before) }
  }

  const accept = useMutation({
    mutationFn: (inviteId: string) => api.accept(inviteId),
    onMutate: removeFromInbox,
    onError: (_error, _id, context) => context?.restore(),
    // The new workspace joins the switcher.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QueryKeys.organizations }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: QueryKeys.myInvites }),
  })
  const decline = useMutation({
    mutationFn: (inviteId: string) => api.decline(inviteId),
    onMutate: removeFromInbox,
    onError: (_error, _id, context) => context?.restore(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: QueryKeys.myInvites }),
  })
  return { accept, decline }
}
