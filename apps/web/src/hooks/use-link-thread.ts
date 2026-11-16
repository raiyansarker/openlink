import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

import { LinkThreadApi } from '#/lib/api/link-thread'
import { QueryKeys } from '#/lib/api/query'

const api = new LinkThreadApi()

/**
 * Comments and history of one link. Every comment change refreshes the
 * history too, since commenting is recorded there.
 */
export function useLinkThread(organizationId: string, linkId: string) {
  const queryClient = useQueryClient()
  const ref = useMemo(() => ({ organizationId, linkId }), [organizationId, linkId])
  const commentsKey = QueryKeys.comments(organizationId, linkId)
  const historyKey = QueryKeys.linkHistory(organizationId, linkId)

  const comments = useQuery({ queryKey: commentsKey, queryFn: () => api.comments(ref) })
  const history = useQuery({ queryKey: historyKey, queryFn: () => api.history(ref) })

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: commentsKey }),
      queryClient.invalidateQueries({ queryKey: historyKey }),
    ])

  const add = useMutation({ mutationFn: (body: string) => api.addComment(ref, body), onSettled: refresh })
  const edit = useMutation({
    mutationFn: (input: { commentId: string; body: string }) => api.editComment(ref, input.commentId, input.body),
    onSettled: refresh,
  })
  const remove = useMutation({ mutationFn: (commentId: string) => api.deleteComment(ref, commentId), onSettled: refresh })
  const react = useMutation({
    mutationFn: (input: { commentId: string; emoji: string }) => api.toggleReaction(ref, input.commentId, input.emoji),
    onSettled: () => queryClient.invalidateQueries({ queryKey: commentsKey }),
  })

  return {
    comments: comments.data ?? [],
    history: history.data ?? [],
    isLoading: comments.isPending || history.isPending,
    error: comments.error ?? history.error,
    addComment: (body: string) => add.mutateAsync(body),
    editComment: (commentId: string, body: string) => edit.mutateAsync({ commentId, body }),
    deleteComment: (commentId: string) => remove.mutateAsync(commentId),
    toggleReaction: (commentId: string, emoji: string) => react.mutateAsync({ commentId, emoji }),
  }
}
