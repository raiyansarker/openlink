import { afterEach, describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import type { OpenLinkDb } from '@openlink/db'
import { organization, organizationInvite, organizationMember, user } from '@openlink/db/schema'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { eq } from 'drizzle-orm'
import { Effect } from 'effect'

import { Db } from '#/server/effect/services/db'
import { hashInviteToken } from './invites'
import { InviteNotFound, MemberNotFound, MemberPermissionDenied, OrganizationConflict } from './errors'
import {
  deleteOrganization,
  listMembers,
  listPendingInvites,
  removeMember,
  resendInvite,
  revokeInvite,
  transferOwnership,
  updateMemberRole,
  updateOrganization,
} from './members'

const databases: Database[] = []
afterEach(() => {
  for (const database of databases.splice(0)) database.close()
})

function setup() {
  const sqlite = new Database(':memory:')
  databases.push(sqlite)
  sqlite.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE user (
      id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      email_verified INTEGER NOT NULL DEFAULT 0, image TEXT,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE organization (
      id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE organization_member (
      id TEXT PRIMARY KEY NOT NULL,
      organization_id TEXT NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      role TEXT NOT NULL, joined_at INTEGER NOT NULL,
      UNIQUE (organization_id, user_id)
    );
    CREATE TABLE organization_invite (
      id TEXT PRIMARY KEY NOT NULL,
      organization_id TEXT REFERENCES organization(id) ON DELETE CASCADE,
      email TEXT NOT NULL, role TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL, expires_at INTEGER NOT NULL, accepted_at INTEGER,
      created_by_user_id TEXT, created_at INTEGER NOT NULL
    );
  `)
  const adapter = drizzle(sqlite)
  const db = adapter as unknown as OpenLinkDb
  const at = (n: number) => new Date(2026, 0, n)
  adapter.insert(organization).values([
    { id: 'o1', name: 'Acme', slug: 'acme', createdAt: at(1), updatedAt: at(1) },
    { id: 'o2', name: 'Other', slug: 'other', createdAt: at(1), updatedAt: at(1) },
  ]).run()
  for (const [id, name] of [['owner', 'Olive'], ['admin', 'Adam'], ['admin2', 'Ada'], ['member', 'Mia'], ['viewer', 'Vic']]) {
    adapter.insert(user).values({ id: id!, name: name!, email: `${id}@example.com`, createdAt: at(1), updatedAt: at(1) }).run()
  }
  const roles = ['owner', 'admin', 'admin', 'member', 'viewer'] as const
  ;(['owner', 'admin', 'admin2', 'member', 'viewer'] as const).forEach((id, i) => {
    adapter.insert(organizationMember).values({
      id: `m-${id}`, organizationId: 'o1', userId: id, role: roles[i]!, joinedAt: at(i + 1),
    }).run()
  })
  const run = <A, E>(effect: Effect.Effect<A, E, Db>) =>
    Effect.runPromise(effect.pipe(Effect.provideService(Db, db)))
  const fail = async <A, E>(effect: Effect.Effect<A, E, Db>) => {
    const exit = await Effect.runPromise(effect.pipe(Effect.provideService(Db, db), Effect.flip))
    return exit
  }
  const roleOf = (userId: string) =>
    adapter.select().from(organizationMember).where(eq(organizationMember.userId, userId)).get()?.role
  const invite = (overrides: Partial<typeof organizationInvite.$inferInsert> = {}) =>
    adapter.insert(organizationInvite).values({
      id: 'i1', organizationId: 'o1', email: 'new@example.com', role: 'member',
      tokenHash: hashInviteToken('old-token'), kind: 'member', expiresAt: at(2), createdAt: at(1),
      ...overrides,
    }).run()
  return { run, fail, roleOf, invite, adapter }
}

describe('listMembers', () => {
  test('returns members of one organization ordered by join date, with profile fields', async () => {
    const t = setup()
    const rows = await t.run(listMembers('o1'))
    expect(rows.map((r) => [r.userId, r.role, r.name])).toEqual([
      ['owner', 'owner', 'Olive'],
      ['admin', 'admin', 'Adam'],
      ['admin2', 'admin', 'Ada'],
      ['member', 'member', 'Mia'],
      ['viewer', 'viewer', 'Vic'],
    ])
    expect(await t.run(listMembers('o2'))).toEqual([])
  })
})

describe('updateMemberRole', () => {
  test('an owner can promote a member to admin', async () => {
    const t = setup()
    const row = await t.run(updateMemberRole({ organizationId: 'o1', actorRole: 'owner', targetUserId: 'member', role: 'admin' }))
    expect(row.role).toBe('admin')
    expect(t.roleOf('member')).toBe('admin')
  })

  test('an admin can move members and viewers but cannot mint admins', async () => {
    const t = setup()
    await t.run(updateMemberRole({ organizationId: 'o1', actorRole: 'admin', targetUserId: 'member', role: 'viewer' }))
    expect(t.roleOf('member')).toBe('viewer')
    const denied = await t.fail(updateMemberRole({ organizationId: 'o1', actorRole: 'admin', targetUserId: 'viewer', role: 'admin' }))
    expect(denied).toBeInstanceOf(MemberPermissionDenied)
    expect(t.roleOf('viewer')).toBe('viewer')
  })

  test('nobody can change an owner or a peer admin (as an admin)', async () => {
    const t = setup()
    for (const targetUserId of ['owner', 'admin2']) {
      const error = await t.fail(updateMemberRole({ organizationId: 'o1', actorRole: 'admin', targetUserId, role: 'viewer' }))
      expect(error).toBeInstanceOf(MemberPermissionDenied)
    }
    expect(t.roleOf('owner')).toBe('owner')
  })

  test('unknown member, or a member of another organization, is not found', async () => {
    const t = setup()
    expect(await t.fail(updateMemberRole({ organizationId: 'o2', actorRole: 'owner', targetUserId: 'member', role: 'viewer' }))).toBeInstanceOf(MemberNotFound)
  })
})

describe('removeMember', () => {
  test('admins remove members; the membership row is deleted', async () => {
    const t = setup()
    await t.run(removeMember({ organizationId: 'o1', actorUserId: 'admin', actorRole: 'admin', targetUserId: 'member' }))
    expect(t.roleOf('member')).toBeUndefined()
  })

  test('admins cannot remove peers or the owner', async () => {
    const t = setup()
    for (const targetUserId of ['admin2', 'owner']) {
      const error = await t.fail(removeMember({ organizationId: 'o1', actorUserId: 'admin', actorRole: 'admin', targetUserId }))
      expect(error).toBeInstanceOf(MemberPermissionDenied)
    }
  })

  test('members can leave on their own, but owners cannot', async () => {
    const t = setup()
    await t.run(removeMember({ organizationId: 'o1', actorUserId: 'viewer', actorRole: 'viewer', targetUserId: 'viewer' }))
    expect(t.roleOf('viewer')).toBeUndefined()
    const error = await t.fail(removeMember({ organizationId: 'o1', actorUserId: 'owner', actorRole: 'owner', targetUserId: 'owner' }))
    expect(error).toBeInstanceOf(MemberPermissionDenied)
  })

  test('a member cannot remove someone else', async () => {
    const t = setup()
    const error = await t.fail(removeMember({ organizationId: 'o1', actorUserId: 'member', actorRole: 'member', targetUserId: 'viewer' }))
    expect(error).toBeInstanceOf(MemberPermissionDenied)
  })
})

describe('transferOwnership', () => {
  test('the target becomes owner and the previous owner an admin', async () => {
    const t = setup()
    await t.run(transferOwnership({ organizationId: 'o1', actorUserId: 'owner', targetUserId: 'member' }))
    expect(t.roleOf('member')).toBe('owner')
    expect(t.roleOf('owner')).toBe('admin')
  })

  test('rejects self transfers and non-members', async () => {
    const t = setup()
    expect(await t.fail(transferOwnership({ organizationId: 'o1', actorUserId: 'owner', targetUserId: 'owner' }))).toBeInstanceOf(MemberPermissionDenied)
    expect(await t.fail(transferOwnership({ organizationId: 'o1', actorUserId: 'owner', targetUserId: 'ghost' }))).toBeInstanceOf(MemberNotFound)
    expect(t.roleOf('owner')).toBe('owner')
  })
})

describe('organization updates', () => {
  test('renames and re-slugs', async () => {
    const t = setup()
    const row = await t.run(updateOrganization({ organizationId: 'o1', name: 'Acme Inc', slug: 'acme-inc' }))
    expect(row).toMatchObject({ name: 'Acme Inc', slug: 'acme-inc' })
  })

  test('a taken slug is a conflict and changes nothing', async () => {
    const t = setup()
    expect(await t.fail(updateOrganization({ organizationId: 'o1', slug: 'other' }))).toBeInstanceOf(OrganizationConflict)
    expect(t.adapter.select().from(organization).where(eq(organization.id, 'o1')).get()?.slug).toBe('acme')
  })

  test('an unknown organization yields null', async () => {
    const t = setup()
    expect(await t.run(updateOrganization({ organizationId: 'nope', name: 'x' }))).toBeNull()
  })

  test('deleting removes the organization and its memberships', async () => {
    const t = setup()
    await t.run(deleteOrganization('o1'))
    expect(t.adapter.select().from(organizationMember).all()).toEqual([])
    expect(t.adapter.select().from(organization).all().map((o) => o.id)).toEqual(['o2'])
  })
})

describe('pending invites', () => {
  test('lists only unaccepted member invites of the organization', async () => {
    const t = setup()
    t.invite()
    t.invite({ id: 'i2', tokenHash: 'h2', acceptedAt: new Date() })
    t.invite({ id: 'i3', tokenHash: 'h3', kind: 'bootstrap', organizationId: null })
    t.invite({ id: 'i4', tokenHash: 'h4', organizationId: 'o2' })
    expect((await t.run(listPendingInvites('o1'))).map((i) => i.id)).toEqual(['i1'])
  })

  test('revoke deletes the invite, and missing ones are not found', async () => {
    const t = setup()
    t.invite()
    await t.run(revokeInvite('o1', 'i1'))
    expect(await t.run(listPendingInvites('o1'))).toEqual([])
    expect(await t.fail(revokeInvite('o1', 'i1'))).toBeInstanceOf(InviteNotFound)
  })

  test('an invite cannot be revoked through another organization', async () => {
    const t = setup()
    t.invite()
    expect(await t.fail(revokeInvite('o2', 'i1'))).toBeInstanceOf(InviteNotFound)
  })

  test('resend rotates the token and extends expiry', async () => {
    const t = setup()
    t.invite()
    const { invite, token } = await t.run(resendInvite('o1', 'i1'))
    expect(invite.tokenHash).toBe(hashInviteToken(token))
    expect(invite.tokenHash).not.toBe(hashInviteToken('old-token'))
    expect(invite.expiresAt.getTime()).toBeGreaterThan(Date.now())
    expect(await t.fail(resendInvite('o1', 'missing'))).toBeInstanceOf(InviteNotFound)
  })
})
