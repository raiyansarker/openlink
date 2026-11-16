import { afterEach, describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { organizationInvite, organizationMember, user } from '@openlink/db/schema'
import { eq } from 'drizzle-orm'
import { Effect } from 'effect'

import { Db } from '#/server/effect/services/db'
import { hashInviteToken } from '#/server/org/invites'
import { acceptMemberInvite, createOrganizationWithBootstrapInvite } from '#/server/org/service'
import { createTestDatabase } from '#/server/testing/sqlite'
import { Onboarding } from './onboarding'

const databases: Database[] = []
afterEach(() => {
  for (const database of databases.splice(0)) database.close()
})

function setup() {
  const { sqlite, adapter, db } = createTestDatabase()
  databases.push(sqlite)
  const now = new Date('2026-01-01T00:00:00Z')
  adapter.insert(user).values([
    { id: 'u1', name: 'Ada', email: 'ada@e.test', createdAt: now, updatedAt: now },
    { id: 'u2', name: 'Bob', email: 'bob@e.test', createdAt: now, updatedAt: now },
  ]).run()
  const run = <A, E>(effect: Effect.Effect<A, E, Db>) => Effect.runPromise(effect.pipe(Effect.provideService(Db, db)))
  const flip = <A, E>(effect: Effect.Effect<A, E, Db>) => Effect.runPromise(effect.pipe(Effect.provideService(Db, db), Effect.flip))
  const onboardedAt = (id: string) => adapter.select().from(user).where(eq(user.id, id)).get()?.onboardedAt ?? null
  return { run, flip, onboardedAt, adapter, now }
}

describe('Onboarding', () => {
  test('a new person is not onboarded; marking it is recorded once', async () => {
    const t = setup()
    expect(await t.run(Onboarding.isComplete('u1'))).toBe(false)
    const first = new Date('2026-02-01T00:00:00Z')
    await t.run(Onboarding.markComplete('u1', first))
    await t.run(Onboarding.markComplete('u1', new Date('2026-03-01T00:00:00Z')))
    expect(await t.run(Onboarding.isComplete('u1'))).toBe(true)
    expect(t.onboardedAt('u1')).toEqual(first)
    expect(await t.run(Onboarding.isComplete('unknown'))).toBe(false)
  })

  test('creating a first workspace needs no invite token and completes onboarding', async () => {
    const t = setup()
    const org = await t.run(createOrganizationWithBootstrapInvite({ userId: 'u1', name: 'Acme', slug: 'acme' }))
    expect(org.slug).toBe('acme')
    expect(t.onboardedAt('u1')).not.toBeNull()
    const owner = t.adapter.select().from(organizationMember).where(eq(organizationMember.userId, 'u1')).get()
    expect(owner?.role).toBe('owner')
    expect(t.onboardedAt('u2')).toBeNull()
  })

  test('a given token must still be valid, and nothing is written when it is not', async () => {
    const t = setup()
    const error = await t.flip(createOrganizationWithBootstrapInvite({ userId: 'u1', name: 'Acme', slug: 'acme', inviteToken: 'nope' }))
    expect(error).toMatchObject({ _tag: 'InvalidBootstrapInvite' })
    expect(t.onboardedAt('u1')).toBeNull()
  })

  test('a taken slug fails without completing onboarding', async () => {
    const t = setup()
    await t.run(createOrganizationWithBootstrapInvite({ userId: 'u1', name: 'Acme', slug: 'acme' }))
    const error = await t.flip(createOrganizationWithBootstrapInvite({ userId: 'u2', name: 'Acme 2', slug: 'acme' }))
    expect(error).toMatchObject({ _tag: 'OrganizationConflict' })
    expect(t.onboardedAt('u2')).toBeNull()
  })

  test('joining a workspace by invite also completes onboarding', async () => {
    const t = setup()
    const org = await t.run(createOrganizationWithBootstrapInvite({ userId: 'u1', name: 'Acme', slug: 'acme' }))
    t.adapter.insert(organizationInvite).values({
      id: 'i1', organizationId: org.id, email: 'bob@e.test', role: 'member', tokenHash: hashInviteToken('tok'),
      kind: 'member', expiresAt: new Date('2999-01-01'), createdAt: t.now,
    }).run()
    await t.run(acceptMemberInvite({ userId: 'u2', userEmail: 'bob@e.test', token: 'tok' }))
    expect(t.onboardedAt('u2')).not.toBeNull()
  })
})

describe('migration 0007 backfill', () => {
  test('people who already belong to a workspace are marked onboarded; others are not', () => {
    const dir = join(import.meta.dir, '../../../../../packages/db/drizzle')
    const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
    const sqlite = new Database(':memory:')
    databases.push(sqlite)
    const apply = (file: string) => {
      for (const statement of readFileSync(join(dir, file), 'utf8').split('--> statement-breakpoint')) {
        if (statement.trim()) sqlite.exec(statement)
      }
    }
    for (const file of files.filter((f) => f < '0007')) apply(file)
    sqlite.exec(`
      INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES
        ('member', 'M', 'm@e.test', 0, 1000, 1000),
        ('newbie', 'N', 'n@e.test', 0, 2000, 2000);
      INSERT INTO organization (id, name, slug, created_at, updated_at) VALUES ('o1', 'Acme', 'acme', 0, 0);
      INSERT INTO organization_member (id, organization_id, user_id, role, joined_at) VALUES ('m1', 'o1', 'member', 'owner', 0);
    `)
    for (const file of files.filter((f) => f >= '0007')) apply(file)
    const rows = sqlite.query('SELECT id, onboarded_at FROM user ORDER BY id').all() as { id: string; onboarded_at: number | null }[]
    expect(rows).toEqual([
      { id: 'member', onboarded_at: 1000 },
      { id: 'newbie', onboarded_at: null },
    ])
  })
})
