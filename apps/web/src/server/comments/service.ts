import { linkComment, user } from '@openlink/db/schema'
import { and, asc, eq } from 'drizzle-orm'
import { Effect } from 'effect'

import { operation } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'
import { CommentForbidden, CommentInvalid, CommentNotFound } from './errors'
import { normalizeCommentBody, parseReactions, toggleReaction } from './rules'

const columns = {
  id: linkComment.id,
  organizationId: linkComment.organizationId,
  linkId: linkComment.linkId,
  authorUserId: linkComment.authorUserId,
  authorLabel: linkComment.authorLabel,
  authorImage: user.image,
  body: linkComment.body,
  reactionsJson: linkComment.reactionsJson,
  createdAt: linkComment.createdAt,
  editedAt: linkComment.editedAt,
}

export type CommentRow = {
  id: string
  organizationId: string
  linkId: string
  authorUserId: string | null
  authorLabel: string
  authorImage: string | null
  body: string
  reactionsJson: string
  createdAt: Date
  editedAt: Date | null
}

const selectComments = () =>
  Effect.gen(function* () {
    const db = yield* Db
    return db.select(columns).from(linkComment).leftJoin(user, eq(user.id, linkComment.authorUserId))
  })

/** Oldest first, like a conversation. */
export function listComments(organizationId: string, linkId: string) {
  return Effect.gen(function* () {
    const query = yield* selectComments()
    return yield* operation('comments.list', () =>
      query
        .where(and(eq(linkComment.organizationId, organizationId), eq(linkComment.linkId, linkId)))
        .orderBy(asc(linkComment.createdAt), asc(linkComment.id)),
    )
  })
}

const findComment = (organizationId: string, linkId: string, commentId: string) =>
  Effect.gen(function* () {
    const query = yield* selectComments()
    const [row] = yield* operation('comments.find', () =>
      query
        .where(
          and(
            eq(linkComment.id, commentId),
            eq(linkComment.organizationId, organizationId),
            eq(linkComment.linkId, linkId),
          ),
        )
        .limit(1),
    )
    return row ? Effect.succeed(row) : Effect.fail(new CommentNotFound())
  }).pipe(Effect.flatten)

const requireBody = (body: string) => {
  const normalized = normalizeCommentBody(body)
  return normalized === null
    ? Effect.fail(new CommentInvalid({ message: 'Write a comment of up to 4000 characters.' }))
    : Effect.succeed(normalized)
}

export function createComment(input: {
  organizationId: string
  linkId: string
  author: { id: string; label: string }
  body: string
}) {
  return Effect.gen(function* () {
    const body = yield* requireBody(input.body)
    const db = yield* Db
    const id = crypto.randomUUID()
    yield* operation('comments.create', () =>
      db.insert(linkComment).values({
        id,
        organizationId: input.organizationId,
        linkId: input.linkId,
        authorUserId: input.author.id,
        authorLabel: input.author.label,
        body,
        createdAt: new Date(),
      }),
    )
    return yield* findComment(input.organizationId, input.linkId, id)
  })
}

/** Only the author may edit. */
export function updateComment(input: {
  organizationId: string
  linkId: string
  commentId: string
  actorUserId: string
  body: string
}) {
  return Effect.gen(function* () {
    const body = yield* requireBody(input.body)
    const existing = yield* findComment(input.organizationId, input.linkId, input.commentId)
    if (existing.authorUserId !== input.actorUserId) {
      return yield* Effect.fail(new CommentForbidden({ message: 'You can only edit your own comments' }))
    }
    const db = yield* Db
    yield* operation('comments.update', () =>
      db.update(linkComment).set({ body, editedAt: new Date() }).where(eq(linkComment.id, existing.id)),
    )
    return yield* findComment(input.organizationId, input.linkId, input.commentId)
  })
}

/** Authors can delete their own comments; administrators can delete any. */
export function deleteComment(input: {
  organizationId: string
  linkId: string
  commentId: string
  actorUserId: string
  actorIsAdmin: boolean
}) {
  return Effect.gen(function* () {
    const existing = yield* findComment(input.organizationId, input.linkId, input.commentId)
    if (existing.authorUserId !== input.actorUserId && !input.actorIsAdmin) {
      return yield* Effect.fail(new CommentForbidden({ message: 'You can only delete your own comments' }))
    }
    const db = yield* Db
    yield* operation('comments.delete', () => db.delete(linkComment).where(eq(linkComment.id, existing.id)))
    return existing
  })
}

export function toggleCommentReaction(input: {
  organizationId: string
  linkId: string
  commentId: string
  userId: string
  emoji: string
}) {
  return Effect.gen(function* () {
    const existing = yield* findComment(input.organizationId, input.linkId, input.commentId)
    const next = toggleReaction(parseReactions(existing.reactionsJson), input.emoji, input.userId)
    if (next === null) {
      return yield* Effect.fail(new CommentInvalid({ message: 'This comment has too many different reactions.' }))
    }
    const db = yield* Db
    yield* operation('comments.react', () =>
      db.update(linkComment).set({ reactionsJson: JSON.stringify(next) }).where(eq(linkComment.id, existing.id)),
    )
    return { ...existing, reactionsJson: JSON.stringify(next) }
  })
}
