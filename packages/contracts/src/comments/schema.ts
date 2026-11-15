import { type } from 'arktype'

import { LinkIdPath } from '../links/schema'

export const MAX_COMMENT_LENGTH = 4000

export const LinkComment = type({
  id: 'string',
  linkId: 'string',
  authorId: 'string | null',
  authorName: 'string',
  'authorImage?': 'string',
  body: 'string',
  createdAt: 'string',
  'editedAt?': 'string',
  /** Emoji → ids of the people who reacted with it. */
  reactions: type({ '[string]': 'string[]' }),
})

export const ListLinkCommentsResponse = type({ items: LinkComment.array() })

export const CommentBody = type({ body: type('string >= 1').and(type(`string <= ${MAX_COMMENT_LENGTH}`)) })

export const ToggleReactionRequest = type({
  emoji: type('string >= 1').and(type('string <= 16')),
})

export const CommentIdPath = type({
  organizationId: 'string',
  domainId: 'string',
  linkId: 'string',
  commentId: 'string',
})

export { LinkIdPath }
