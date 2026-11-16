import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useMemo } from 'react'

import type { LinkComment } from '#/data/demo/types'
import { LinkThreadApi } from '#/lib/api/link-thread'
import { QueryKeys } from '#/lib/api/query'

const api = new LinkThreadApi()

/** A comment shown before the server has confirmed it. */
export type ThreadComment = LinkComment & {
  isPending?: boolean
  /** Stays the same when the server's copy replaces the optimistic one, so the row is not remounted. */
  clientKey?: string
}

export type ThreadViewer = { id: string; name: string; avatarUrl?: string }

/** Optimistic edits to the cached thread, rolled back if the server says no. */
class ThreadCache {
  constructor(
    private readonly queryClient: ReturnType<typeof useQueryClient>,
    private readonly key: QueryKey,
  ) {}

  /** Apply `change` now; returns a function that restores the thread as it was. */
  async change(change: (comments: ThreadComment[]) => ThreadComment[]) {
    await this.queryClient.cancelQueries({ queryKey: this.key })
    const before = this.queryClient.getQueryData<ThreadComment[]>(this.key)
    this.queryClient.setQueryData<ThreadComment[]>(this.key, (current) => change(current ?? []))
    return () => this.queryClient.setQueryData(this.key, before)
  }

  replace(id: string, next: ThreadComment) {
    this.queryClient.setQueryData<ThreadComment[]>(this.key, (current) =>
      (current ?? []).map((comment) => (comment.id === id ? { ...next, clientKey: comment.clientKey ?? comment.id } : comment)),
    )
  }

  static toggleReaction(comment: ThreadComment, emoji: string, userId: string): ThreadComment {
    const people = comment.reactions?.[emoji] ?? []
    const next = people.includes(userId) ? people.filter((id) => id !== userId) : [...people, userId]
    const { [emoji]: _removed, ...rest } = comment.reactions ?? {}
    return { ...comment, reactions: next.length > 0 ? { ...rest, [emoji]: next } : rest }
  }
}

/**
 * Comments and history of one link. Every change shows at once and is rolled
 * back if the server refuses it; history refreshes after, since commenting is
 * recorded there.
 */
export function useLinkThread(organizationId: string, linkId: string, viewer: ThreadViewer) {
  const queryClient = useQueryClient()
  const ref = useMemo(() => ({ organizationId, linkId }), [organizationId, linkId])
  const commentsKey = QueryKeys.comments(organizationId, linkId)
  const historyKey = QueryKeys.linkHistory(organizationId, linkId)
  const cache = new ThreadCache(queryClient, commentsKey)

  const comments = useQuery<ThreadComment[]>({ queryKey: commentsKey, queryFn: () => api.comments(ref) })
  const history = useQuery({ queryKey: historyKey, queryFn: () => api.history(ref) })

  const refreshHistory = () => queryClient.invalidateQueries({ queryKey: historyKey })

  const add = useMutation({
    mutationFn: (input: { body: string; tempId: string }) => api.addComment(ref, input.body),
    onMutate: async ({ body, tempId }) => {
      const restore = await cache.change((current) => [
        ...current,
        {
          id: tempId,
          at: new Date().toISOString(),
          authorId: viewer.id,
          authorName: viewer.name,
          ...(viewer.avatarUrl ? { authorAvatarUrl: viewer.avatarUrl } : {}),
          body,
          reactions: {},
          isPending: true,
          clientKey: tempId,
        },
      ])
      return { restore }
    },
    onSuccess: (saved, { tempId }) => cache.replace(tempId, saved),
    onError: (_error, _input, context) => context?.restore(),
    onSettled: refreshHistory,
  })

  const edit = useMutation({
    mutationFn: (input: { commentId: string; body: string }) => api.editComment(ref, input.commentId, input.body),
    onMutate: async ({ commentId, body }) => ({
      restore: await cache.change((current) =>
        current.map((c) => (c.id === commentId ? { ...c, body, editedAt: new Date().toISOString() } : c)),
      ),
    }),
    onSuccess: (saved) => cache.replace(saved.id, saved),
    onError: (_error, _input, context) => context?.restore(),
    onSettled: refreshHistory,
  })

  const remove = useMutation({
    mutationFn: (commentId: string) => api.deleteComment(ref, commentId),
    onMutate: async (commentId) => ({ restore: await cache.change((current) => current.filter((c) => c.id !== commentId)) }),
    onError: (_error, _input, context) => context?.restore(),
    onSettled: refreshHistory,
  })

  const react = useMutation({
    mutationFn: (input: { commentId: string; emoji: string }) => api.toggleReaction(ref, input.commentId, input.emoji),
    onMutate: async ({ commentId, emoji }) => ({
      restore: await cache.change((current) =>
        current.map((c) => (c.id === commentId ? ThreadCache.toggleReaction(c, emoji, viewer.id) : c)),
      ),
    }),
    onSuccess: (saved) => cache.replace(saved.id, saved),
    onError: (_error, _input, context) => context?.restore(),
  })

  return {
    comments: comments.data ?? [],
    history: history.data ?? [],
    isLoadingComments: comments.isPending,
    isLoadingHistory: history.isPending,
    commentsError: comments.error,
    historyError: history.error,
    retry: () => Promise.all([comments.refetch(), history.refetch()]),
    addComment: (body: string) => add.mutateAsync({ body, tempId: `pending-${crypto.randomUUID()}` }),
    editComment: (commentId: string, body: string) => edit.mutateAsync({ commentId, body }),
    deleteComment: (commentId: string) => remove.mutateAsync(commentId),
    toggleReaction: (commentId: string, emoji: string) => react.mutateAsync({ commentId, emoji }),
  }
}
