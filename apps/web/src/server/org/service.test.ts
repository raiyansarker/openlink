import { Database } from 'bun:sqlite'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import type { OpenLinkDb } from '@openlink/db'
import * as schema from '@openlink/db/schema'
import { drizzle } from 'drizzle-orm/sqlite-proxy'
import { Effect } from 'effect'
import { getDomainInOrganization, requireOrgMembership } from '../api/access'
import { BackendError } from '../effect/operations'
import { Db } from '../effect/services/db'
import type { Db as DbService } from '../effect/services/db'
import { canManageLinks, getMembership, isAdmin } from './access'
import { findBootstrapInviteByToken, hashInviteToken } from './invites'
import {
  acceptMemberInvite,
  createMemberInvite,
  createOrganizationWithBootstrapInvite,
  getOrganizationById,
  InvalidBootstrapInvite,
  InvalidInvite,
  InviteEmailMismatch,
  listOrganizationsForUser,
  OrganizationConflict,
} from './service'

let sqlite: Database
let db: OpenLinkDb
let failSql: ((sql: string) => boolean) | undefined
const ioFailure = new Error('injected database failure')

beforeEach(() => {
  sqlite = new Database(':memory:')
  sqlite.exec('PRAGMA foreign_keys = ON')
  for (const migration of [
    '0000_panoramic_patch.sql',
    '0001_workspace_owners.sql',
  ]) {
    sqlite.exec(
      readFileSync(
        new URL(
          `../../../../../packages/db/drizzle/${migration}`,
          import.meta.url,
        ),
        'utf8',
      ),
    )
  }
  // SQLite proxy executes asynchronously like D1; only the adapter differs from OpenLinkDb.
  db = drizzle(
    async (sql, params, method) => {
      await Promise.resolve()
      if (failSql?.(sql)) throw ioFailure
      const query = sqlite.query(sql)
      if (method === 'run') {
        query.run(...params)
        return { rows: [] }
      }
      return { rows: query.values(...params) }
    },
    { schema },
  ) as unknown as OpenLinkDb
  failSql = undefined
  sqlite.run(
    'INSERT INTO user (id, name, email, created_at, updated_at) VALUES (?, ?, ?, 0, 0)',
    ['user-1', 'User', 'user@example.com'],
  )
  sqlite.run('INSERT INTO organization VALUES (?, ?, ?, 0, 0)', [
    'org-1',
    'Organization',
    'organization',
  ])
})

afterEach(() => sqlite.close())

function run<A, E>(effect: Effect.Effect<A, E, DbService>) {
  return Effect.runPromise(effect.pipe(Effect.provideService(Db, db)))
}

function seedInvite(
  options: {
    kind?: 'bootstrap' | 'member'
    organizationId?: string | null
    expiresAt?: number
    acceptedAt?: number | null
    email?: string
  } = {},
) {
  sqlite.run(
    `INSERT INTO organization_invite
    (id, organization_id, email, role, token_hash, kind, expires_at, accepted_at, created_at)
    VALUES (?, ?, ?, 'admin', ?, ?, ?, ?, 0)`,
    [
      'invite-1',
      options.organizationId === undefined ? 'org-1' : options.organizationId,
      options.email ?? 'USER@example.com',
      hashInviteToken('token'),
      options.kind ?? 'member',
      options.expiresAt ?? Date.now() + 60_000,
      options.acceptedAt ?? null,
    ],
  )
}

function seedMember(role = 'owner') {
  sqlite.run('INSERT INTO organization_member VALUES (?, ?, ?, ?, 0)', [
    'member-1',
    'org-1',
    'user-1',
    role,
  ])
}

function inviteRow() {
  return sqlite
    .query('SELECT accepted_at FROM organization_invite WHERE id = ?')
    .get('invite-1') as { accepted_at: number | null }
}

const createInput = {
  userId: 'user-1',
  name: 'New Organization',
  slug: 'new-org',
  inviteToken: 'token',
}
const acceptInput = {
  userId: 'user-1',
  userEmail: 'user@example.com',
  token: 'token',
}

describe('Effect organization services with injected async SQLite', () => {
  test('zero-field errors expose the expected tags', () => {
    expect([
      new InvalidBootstrapInvite()._tag,
      new InvalidInvite()._tag,
      new InviteEmailMismatch()._tag,
      new OrganizationConflict()._tag,
    ]).toEqual([
      'InvalidBootstrapInvite',
      'InvalidInvite',
      'InviteEmailMismatch',
      'OrganizationConflict',
    ])
  })

  test('lookup Effects return rows or null and organization lists are user-scoped', async () => {
    expect(await run(getOrganizationById('missing'))).toBeNull()
    expect(await run(getMembership('user-1', 'org-1'))).toBeNull()
    expect(await run(requireOrgMembership('user-1', 'org-1'))).toBeNull()
    expect(await run(listOrganizationsForUser('user-1'))).toEqual([])
    seedMember()
    expect(await run(getOrganizationById('org-1'))).toMatchObject({
      id: 'org-1',
    })
    expect(await run(requireOrgMembership('user-1', 'org-1'))).toMatchObject({
      role: 'owner',
    })
    expect(await run(getMembership('user-1', 'another-org'))).toBeNull()
    expect(await run(getMembership('another-user', 'org-1'))).toBeNull()
    expect(await run(listOrganizationsForUser('user-1'))).toMatchObject([
      { organization: { id: 'org-1' }, member: { role: 'owner' } },
    ])
    expect(await run(listOrganizationsForUser('another-user'))).toEqual([])
    expect(isAdmin('owner')).toBe(true)
    expect(canManageLinks('viewer')).toBe(false)
  })

  test('domain access requires both domain and organization IDs', async () => {
    sqlite.run(`INSERT INTO custom_domain
      (id, organization_id, hostname, provider, created_at, updated_at)
      VALUES ('domain-1', 'org-1', 'example.com', 'memory', 0, 0)`)
    expect(
      await run(getDomainInOrganization('domain-1', 'org-1')),
    ).toMatchObject({ id: 'domain-1' })
    expect(
      await run(getDomainInOrganization('domain-1', 'another-org')),
    ).toBeNull()
    expect(await run(getDomainInOrganization('missing', 'org-1'))).toBeNull()
  })

  test('bootstrap lookup filters token, kind and acceptance without adding an expiry check', async () => {
    expect(await run(findBootstrapInviteByToken('token'))).toBeNull()
    seedInvite({ kind: 'bootstrap', organizationId: null, expiresAt: 0 })
    expect(await run(findBootstrapInviteByToken('wrong-token'))).toBeNull()
    expect(await run(findBootstrapInviteByToken('token'))).toMatchObject({
      id: 'invite-1',
    })
    sqlite.run('UPDATE organization_invite SET accepted_at = 1')
    expect(await run(findBootstrapInviteByToken('token'))).toBeNull()
    sqlite.run(
      "UPDATE organization_invite SET accepted_at = NULL, kind = 'member'",
    )
    expect(await run(findBootstrapInviteByToken('token'))).toBeNull()
  })

  test('invalid bootstrap token fails before writing', async () => {
    expect(
      await run(
        Effect.flip(createOrganizationWithBootstrapInvite(createInput)),
      ),
    ).toBeInstanceOf(InvalidBootstrapInvite)
    expect(sqlite.query('SELECT id FROM organization').all()).toHaveLength(1)
  })

  test('creation is lazy, creates an owner, and consumes the bootstrap invite', async () => {
    seedInvite({ kind: 'bootstrap', organizationId: null })
    const effect = createOrganizationWithBootstrapInvite(createInput)
    expect(sqlite.query('SELECT id FROM organization').all()).toHaveLength(1)
    const org = await run(effect)
    expect(org).toMatchObject({
      name: createInput.name,
      slug: createInput.slug,
    })
    expect(await run(getMembership('user-1', org.id))).toMatchObject({
      role: 'owner',
    })
    expect(inviteRow().accepted_at).toBeNumber()
    expect(await run(findBootstrapInviteByToken('token'))).toBeNull()
  })

  test('organization UNIQUE failure becomes OrganizationConflict without consuming the invite', async () => {
    seedInvite({ kind: 'bootstrap', organizationId: null })
    expect(
      await run(
        Effect.flip(
          createOrganizationWithBootstrapInvite({
            ...createInput,
            slug: 'organization',
          }),
        ),
      ),
    ).toBeInstanceOf(OrganizationConflict)
    expect(inviteRow().accepted_at).toBeNull()
    expect(
      sqlite.query('SELECT id FROM organization_member').all(),
    ).toHaveLength(0)
  })

  test('member invites normalize email, hash tokens, and expire in fourteen days', async () => {
    const before = Date.now()
    const { invite, token } = await run(
      createMemberInvite({
        organizationId: 'org-1',
        email: 'USER@Example.com',
        role: 'viewer',
        createdByUserId: 'user-1',
      }),
    )
    expect(invite).toMatchObject({
      email: 'user@example.com',
      role: 'viewer',
      kind: 'member',
      tokenHash: hashInviteToken(token),
    })
    expect(invite.tokenHash).not.toBe(token)
    expect(invite.expiresAt.getTime() - invite.createdAt.getTime()).toBe(
      14 * 24 * 60 * 60 * 1000,
    )
    expect(invite.createdAt.getTime()).toBeGreaterThanOrEqual(before)
  })

  test.each(['missing', 'expired', 'accepted', 'bootstrap', 'no-organization'])(
    '%s member invite fails with InvalidInvite without writing',
    async (scenario) => {
      if (scenario !== 'missing')
        seedInvite({
          expiresAt: scenario === 'expired' ? 0 : undefined,
          acceptedAt: scenario === 'accepted' ? 1 : null,
          kind: scenario === 'bootstrap' ? 'bootstrap' : 'member',
          organizationId: scenario === 'no-organization' ? null : 'org-1',
        })
      expect(
        await run(Effect.flip(acceptMemberInvite(acceptInput))),
      ).toBeInstanceOf(InvalidInvite)
      expect(
        sqlite.query('SELECT id FROM organization_member').all(),
      ).toHaveLength(0)
      if (scenario !== 'missing')
        expect(inviteRow().accepted_at).toBe(scenario === 'accepted' ? 1 : null)
    },
  )

  test('email mismatch is a typed failure and does not consume the invite', async () => {
    seedInvite({ email: 'someone-else@example.com' })
    expect(
      await run(Effect.flip(acceptMemberInvite(acceptInput))),
    ).toBeInstanceOf(InviteEmailMismatch)
    expect(inviteRow().accepted_at).toBeNull()
    expect(
      sqlite.query('SELECT id FROM organization_member').all(),
    ).toHaveLength(0)
  })

  test('acceptance matches email case-insensitively and creates the invited role', async () => {
    seedInvite()
    expect(await run(acceptMemberInvite(acceptInput))).toMatchObject({
      org: { id: 'org-1' },
      member: { userId: 'user-1', role: 'admin' },
    })
    expect(inviteRow().accepted_at).toBeNumber()
    expect(
      await run(Effect.flip(acceptMemberInvite(acceptInput))),
    ).toBeInstanceOf(InvalidInvite)
  })

  test('acceptance preserves an existing owner and consumes the invite without duplicating membership', async () => {
    seedMember()
    seedInvite()
    expect(await run(acceptMemberInvite(acceptInput))).toMatchObject({
      member: { id: 'member-1', role: 'owner' },
    })
    expect(
      sqlite.query('SELECT id FROM organization_member').all(),
    ).toHaveLength(1)
    expect(inviteRow().accepted_at).toBeNumber()
  })

  test.each([
    ['org.getMembership', () => getMembership('user-1', 'org-1')],
    ['org.listOrganizationsForUser', () => listOrganizationsForUser('user-1')],
    ['org.getOrganizationById', () => getOrganizationById('org-1')],
    [
      'org.findBootstrapInviteByToken',
      () => findBootstrapInviteByToken('token'),
    ],
    ['org.findMemberInvite', () => acceptMemberInvite(acceptInput)],
    [
      'access.getDomainInOrganization',
      () => getDomainInOrganization('domain-1', 'org-1'),
    ],
  ] as const)(
    '%s keeps database failures in the typed channel',
    async (name, makeEffect) => {
      failSql = () => true
      const error = await run(
        Effect.flip(makeEffect() as Effect.Effect<unknown, unknown, DbService>),
      )
      expect(error).toBeInstanceOf(BackendError)
      expect(error).toMatchObject({
        operation: name,
        cause: { cause: ioFailure },
      })
    },
  )

  test('non-UNIQUE organization insert errors remain BackendError', async () => {
    seedInvite({ kind: 'bootstrap', organizationId: null })
    failSql = (sql) => sql.startsWith('insert into "organization"')
    expect(
      await run(
        Effect.flip(createOrganizationWithBootstrapInvite(createInput)),
      ),
    ).toMatchObject({
      _tag: 'BackendError',
      operation: 'org.createOrganization',
    })
    expect(inviteRow().accepted_at).toBeNull()
  })

  test('owner insertion failure preserves the existing partial-write behavior', async () => {
    seedInvite({ kind: 'bootstrap', organizationId: null })
    failSql = (sql) => sql.startsWith('insert into "organization_member"')
    expect(
      await run(
        Effect.flip(createOrganizationWithBootstrapInvite(createInput)),
      ),
    ).toMatchObject({
      _tag: 'BackendError',
      operation: 'org.createOwnerMembership',
    })
    expect(sqlite.query('SELECT id FROM organization').all()).toHaveLength(2)
    expect(
      sqlite.query('SELECT id FROM organization_member').all(),
    ).toHaveLength(0)
    expect(inviteRow().accepted_at).toBeNull()
  })

  test('bootstrap consumption failure leaves the organization and owner written', async () => {
    seedInvite({ kind: 'bootstrap', organizationId: null })
    failSql = (sql) => sql.startsWith('update "organization_invite"')
    expect(
      await run(
        Effect.flip(createOrganizationWithBootstrapInvite(createInput)),
      ),
    ).toMatchObject({
      _tag: 'BackendError',
      operation: 'org.acceptBootstrapInvite',
    })
    expect(sqlite.query('SELECT id FROM organization').all()).toHaveLength(2)
    expect(sqlite.query('SELECT role FROM organization_member').all()).toEqual([
      { role: 'owner' },
    ])
    expect(inviteRow().accepted_at).toBeNull()
  })

  test('invite consumption failure leaves the new membership written and invite unconsumed', async () => {
    seedInvite()
    failSql = (sql) => sql.startsWith('update "organization_invite"')
    expect(
      await run(Effect.flip(acceptMemberInvite(acceptInput))),
    ).toMatchObject({
      _tag: 'BackendError',
      operation: 'org.acceptMemberInvite',
    })
    expect(await run(getMembership('user-1', 'org-1'))).toMatchObject({
      role: 'admin',
    })
    expect(inviteRow().accepted_at).toBeNull()
  })
})
