import { afterEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { linkComment, user } from '@openlink/db/schema'
import { eq } from 'drizzle-orm'
import { Effect } from 'effect'

import { Db } from '#/server/effect/services/db'
import { createTestDatabase } from '#/server/testing/sqlite'
import { CommentForbidden, CommentInvalid, CommentNotFound } from './errors'
import { createComment, deleteComment, listComments, toggleCommentReaction, updateComment } from './service'

const databases: Database[] = []
afterEach(() => {
  for (const database of databases.splice(0)) database.close()
})

const ada = { id: 'u1', label: 'Ada' }
const bob = { id: 'u2', label: 'Bob' }

function setup() {
  const { sqlite, adapter, db } = createTestDatabase()
  databases.push(sqlite)
  const now = new Date()
  adapter.insert(user).values([
    { id: 'u1', name: 'Ada', email: 'a@e.test', image: 'https://img/a.png', createdAt: now, updatedAt: now },
    { id: 'u2', name: 'Bob', email: 'b@e.test', createdAt: now, updatedAt: now },
  ]).run()
  const run = <A, E>(effect: Effect.Effect<A, E, Db>) => Effect.runPromise(effect.pipe(Effect.provideService(Db, db)))
  const fail = <A, E>(effect: Effect.Effect<A, E, Db>) =>
    Effect.runPromise(effect.pipe(Effect.provideService(Db, db), Effect.flip))
  const post = (author = ada, body = 'hello', linkId = 'l1', organizationId = 'o1') =>
    run(createComment({ organizationId, linkId, author, body }))
  return { run, fail, post, adapter }
}

describe('createComment / listComments', () => {
  test('creates a trimmed comment with the author profile and lists oldest first', async () => {
    const t = setup()
    const first = await t.post(ada, '  first ')
    await new Promise((resolve) => setTimeout(resolve, 2))
    await t.post(bob, 'second')
    expect(first).toMatchObject({ body: 'first', authorUserId: 'u1', authorLabel: 'Ada', authorImage: 'https://img/a.png', editedAt: null })
    const rows = await t.run(listComments('o1', 'l1'))
    expect(rows.map((r) => r.body)).toEqual(['first', 'second'])
  })

  test('is scoped to the link and organization', async () => {
    const t = setup()
    await t.post(ada, 'mine')
    await t.post(ada, 'other link', 'l2')
    await t.post(ada, 'other org', 'l1', 'o2')
    expect((await t.run(listComments('o1', 'l1'))).map((r) => r.body)).toEqual(['mine'])
  })

  test('rejects empty and oversized bodies', async () => {
    const t = setup()
    expect(await t.fail(createComment({ organizationId: 'o1', linkId: 'l1', author: ada, body: '   ' }))).toBeInstanceOf(CommentInvalid)
    expect(await t.fail(createComment({ organizationId: 'o1', linkId: 'l1', author: ada, body: 'x'.repeat(4001) }))).toBeInstanceOf(CommentInvalid)
  })

  test('keeps the comment, with its snapshotted label, after the author is deleted', async () => {
    const t = setup()
    await t.post(bob, 'bye')
    t.adapter.$client.exec('PRAGMA foreign_keys = ON')
    t.adapter.delete(user).where(eq(user.id, 'u2')).run()
    const [row] = await t.run(listComments('o1', 'l1'))
    expect(row).toMatchObject({ body: 'bye', authorLabel: 'Bob', authorUserId: null })
  })
})

describe('updateComment', () => {
  test('the author can edit and the edit time is recorded', async () => {
    const t = setup()
    const created = await t.post()
    const edited = await t.run(updateComment({ organizationId: 'o1', linkId: 'l1', commentId: created.id, actorUserId: 'u1', body: 'changed' }))
    expect(edited.body).toBe('changed')
    expect(edited.editedAt).toBeInstanceOf(Date)
  })

  test('others cannot edit, and wrong link or organization is not found', async () => {
    const t = setup()
    const created = await t.post()
    expect(await t.fail(updateComment({ organizationId: 'o1', linkId: 'l1', commentId: created.id, actorUserId: 'u2', body: 'x' }))).toBeInstanceOf(CommentForbidden)
    expect(await t.fail(updateComment({ organizationId: 'o1', linkId: 'other', commentId: created.id, actorUserId: 'u1', body: 'x' }))).toBeInstanceOf(CommentNotFound)
    expect(await t.fail(updateComment({ organizationId: 'o2', linkId: 'l1', commentId: created.id, actorUserId: 'u1', body: 'x' }))).toBeInstanceOf(CommentNotFound)
    expect((await t.run(listComments('o1', 'l1')))[0]!.body).toBe('hello')
  })
})

describe('deleteComment', () => {
  test('authors and admins may delete; other members may not', async () => {
    const t = setup()
    const mine = await t.post(ada)
    const theirs = await t.post(ada, 'again')
    expect(await t.fail(deleteComment({ organizationId: 'o1', linkId: 'l1', commentId: mine.id, actorUserId: 'u2', actorIsAdmin: false }))).toBeInstanceOf(CommentForbidden)
    await t.run(deleteComment({ organizationId: 'o1', linkId: 'l1', commentId: mine.id, actorUserId: 'u1', actorIsAdmin: false }))
    await t.run(deleteComment({ organizationId: 'o1', linkId: 'l1', commentId: theirs.id, actorUserId: 'u2', actorIsAdmin: true }))
    expect(await t.run(listComments('o1', 'l1'))).toEqual([])
    expect(await t.fail(deleteComment({ organizationId: 'o1', linkId: 'l1', commentId: mine.id, actorUserId: 'u1', actorIsAdmin: false }))).toBeInstanceOf(CommentNotFound)
  })
})

describe('toggleCommentReaction', () => {
  test('adds and removes a reaction per user, persisting it', async () => {
    const t = setup()
    const c = await t.post()
    const react = (userId: string, emoji = '👍') =>
      t.run(toggleCommentReaction({ organizationId: 'o1', linkId: 'l1', commentId: c.id, userId, emoji }))
    expect(JSON.parse((await react('u1')).reactionsJson)).toEqual({ '👍': ['u1'] })
    expect(JSON.parse((await react('u2')).reactionsJson)).toEqual({ '👍': ['u1', 'u2'] })
    expect(JSON.parse((await react('u1')).reactionsJson)).toEqual({ '👍': ['u2'] })
    expect(JSON.parse(t.adapter.select().from(linkComment).get()!.reactionsJson)).toEqual({ '👍': ['u2'] })
  })

  test('refuses a new reaction kind past the limit', async () => {
    const t = setup()
    const c = await t.post()
    for (let i = 0; i < 10; i += 1) {
      await t.run(toggleCommentReaction({ organizationId: 'o1', linkId: 'l1', commentId: c.id, userId: 'u1', emoji: `e${i}` }))
    }
    expect(await t.fail(toggleCommentReaction({ organizationId: 'o1', linkId: 'l1', commentId: c.id, userId: 'u1', emoji: 'extra' }))).toBeInstanceOf(CommentInvalid)
  })
})
