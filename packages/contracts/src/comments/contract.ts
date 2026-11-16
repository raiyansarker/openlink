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
  WorkspaceCommentIdPath,
  WorkspaceLinkIdPath,
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

/**
 * The same thread addressed without a domain, so links on the app's own host
 * (no domain) have comments too. The editor uses these.
 */
const WORKSPACE_COMMENTS = '/organizations/{organizationId}/links/{linkId}/comments'

export const listWorkspaceLinkComments = commentOp('GET', 'listWorkspaceLinkComments', WORKSPACE_COMMENTS)
  .input(type({ params: WorkspaceLinkIdPath }))
  .output(ListLinkCommentsResponse)

export const createWorkspaceLinkComment = commentOp('POST', 'createWorkspaceLinkComment', WORKSPACE_COMMENTS, { successStatus: 201 })
  .input(type({ params: WorkspaceLinkIdPath, body: CommentBody }))
  .output(LinkComment)

export const updateWorkspaceLinkComment = commentOp('PATCH', 'updateWorkspaceLinkComment', `${WORKSPACE_COMMENTS}/{commentId}`, {
  summary: 'Edit your own comment',
})
  .input(type({ params: WorkspaceCommentIdPath, body: CommentBody }))
  .output(LinkComment)

export const deleteWorkspaceLinkComment = commentOp('DELETE', 'deleteWorkspaceLinkComment', `${WORKSPACE_COMMENTS}/{commentId}`, {
  successStatus: 204,
  summary: 'Delete your own comment (administrators may delete any)',
})
  .input(type({ params: WorkspaceCommentIdPath }))
  .output(EmptyResponse)

export const toggleWorkspaceCommentReaction = commentOp(
  'POST',
  'toggleWorkspaceCommentReaction',
  `${WORKSPACE_COMMENTS}/{commentId}/reactions`,
  { summary: 'Add your reaction, or remove it if already present' },
)
  .input(type({ params: WorkspaceCommentIdPath, body: ToggleReactionRequest }))
  .output(LinkComment)

export const contract = {
  listWorkspaceLinkComments,
  createWorkspaceLinkComment,
  updateWorkspaceLinkComment,
  deleteWorkspaceLinkComment,
  toggleWorkspaceCommentReaction,
  listLinkComments,
  createLinkComment,
  updateLinkComment,
  deleteLinkComment,
  toggleCommentReaction,
} as const
