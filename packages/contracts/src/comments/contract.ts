import { type } from 'arktype'

import { EmptyResponse } from '../system/schema'
import { oc, openapi } from '../oc'
import {
  CommentBody,
  CommentIdPath,
  LinkComment,
  LinkIdPath,
  ListLinkCommentsResponse,
  ToggleReactionRequest,
} from './schema'

const COMMENTS = '/organizations/{organizationId}/domains/{domainId}/links/{linkId}/comments'

const commentOp = (
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  operationId: string,
  path: `/${string}`,
  extra: { successStatus?: 201 | 204; summary?: string } = {},
) =>
  oc.meta(openapi({ method, operationId, path, inputStructure: 'detailed', tags: ['Comments'], ...extra }))

export const listLinkComments = commentOp('GET', 'listLinkComments', COMMENTS)
  .input(type({ params: LinkIdPath }))
  .output(ListLinkCommentsResponse)

export const createLinkComment = commentOp('POST', 'createLinkComment', COMMENTS, { successStatus: 201 })
  .input(type({ params: LinkIdPath, body: CommentBody }))
  .output(LinkComment)

export const updateLinkComment = commentOp('PATCH', 'updateLinkComment', `${COMMENTS}/{commentId}`, {
  summary: 'Edit your own comment',
})
  .input(type({ params: CommentIdPath, body: CommentBody }))
  .output(LinkComment)

export const deleteLinkComment = commentOp('DELETE', 'deleteLinkComment', `${COMMENTS}/{commentId}`, {
  successStatus: 204,
  summary: 'Delete your own comment (administrators may delete any)',
})
  .input(type({ params: CommentIdPath }))
  .output(EmptyResponse)

export const toggleCommentReaction = commentOp('POST', 'toggleCommentReaction', `${COMMENTS}/{commentId}/reactions`, {
  summary: 'Add your reaction, or remove it if already present',
})
  .input(type({ params: CommentIdPath, body: ToggleReactionRequest }))
  .output(LinkComment)

export const contract = {
  listLinkComments,
  createLinkComment,
  updateLinkComment,
  deleteLinkComment,
  toggleCommentReaction,
} as const
