import { Database } from 'bun:sqlite'
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import type { OpenLinkDb } from '@openlink/db'
import * as schema from '@openlink/db/schema'
import { drizzle } from 'drizzle-orm/sqlite-proxy'
import { Effect } from 'effect'
import { getDomainInOrganization, requireOrgMembership } from '../api/access'
import { BackendError } from '../effect/operations'
import { Db } from '../effect/services/db'
import type { Db as DbService } from '../effect/services/db'
import { canManageLinks, getMembership, isAdmin } from './access'
import { hashInviteToken } from './invites'
import {
  acceptInviteById,
  createMemberInvite,
  createOrganizationForUser,
  getOrganizationById,
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
  // Every checked-in migration, in order, so the test schema never drifts from production.
  for (const migration of readdirSync(new URL('../../../../../packages/db/drizzle/', import.meta.url))
    .filter((file) => file.endsWith('.sql'))
    .sort()) {
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
  const execute = (sql: string, params: unknown[], method: string) => {
    if (failSql?.(sql)) throw ioFailure
    const query = sqlite.query(sql)
    if (method === 'run') {
      query.run(...(params as never[]))
      return { rows: [] }
    }
    return { rows: query.values(...(params as never[])) }
  }
  db = drizzle(
    async (sql, params, method) => {
      await Promise.resolve()
      return execute(sql, params, method)
    },
    // Like D1, a batch is one transaction: a failing statement rolls back the rest.
    async (queries) => {
      await Promise.resolve()
      return sqlite.transaction(() => queries.map((q) => execute(q.sql, q.params, q.method)))()
    },
    { schema },
  ) as unknown as OpenLinkDb
  failSql = undefined
  sqlite.run(
    'INSERT INTO user (id, name, email, created_at, updated_at) VALUES (?, ?, ?, 0, 0)',
    ['user-1', 'User', 'user@example.com'],
  )
  sqlite.run('INSERT INTO organization (id, name, slug, created_at, updated_at) VALUES (?, ?, ?, 0, 0)', [
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
  sqlite.run('INSERT INTO organization_member (id, organization_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, 0)', [
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
  id: 'org-new',
  userId: 'user-1',
  name: 'New Organization',
  slug: 'new-org',
}
const acceptInput = {
  inviteId: 'invite-1',
  userId: 'user-1',
  userEmail: 'user@example.com',
}

describe('Effect organization services with injected async SQLite', () => {
  test('zero-field errors expose the expected tags', () => {
    expect([
      new InvalidInvite()._tag,
      new InviteEmailMismatch()._tag,
      new OrganizationConflict()._tag,
    ]).toEqual([
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

  test('creation is lazy, creates an owner, and saves the logo key', async () => {
    const effect = createOrganizationForUser({ ...createInput, logoKey: 'logos/org-new/abc.webp' })
    expect(sqlite.query('SELECT id FROM organization').all()).toHaveLength(1)
    const org = await run(effect)
    expect(org).toMatchObject({
      id: 'org-new',
      name: createInput.name,
      slug: createInput.slug,
      logoKey: 'logos/org-new/abc.webp',
    })
    expect(await run(getMembership('user-1', org.id))).toMatchObject({
      role: 'owner',
    })
  })

  test('organization UNIQUE failure becomes OrganizationConflict without writing a member', async () => {
    expect(
      await run(
        Effect.flip(
          createOrganizationForUser({
            ...createInput,
            slug: 'organization',
          }),
        ),
      ),
    ).toBeInstanceOf(OrganizationConflict)
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
        await run(Effect.flip(acceptInviteById(acceptInput))),
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
      await run(Effect.flip(acceptInviteById(acceptInput))),
    ).toBeInstanceOf(InviteEmailMismatch)
    expect(inviteRow().accepted_at).toBeNull()
    expect(
      sqlite.query('SELECT id FROM organization_member').all(),
    ).toHaveLength(0)
  })

  test('acceptance matches email case-insensitively and creates the invited role', async () => {
    seedInvite()
    expect(await run(acceptInviteById(acceptInput))).toMatchObject({
      org: { id: 'org-1' },
      member: { userId: 'user-1', role: 'admin' },
    })
    expect(inviteRow().accepted_at).toBeNumber()
    expect(
      await run(Effect.flip(acceptInviteById(acceptInput))),
    ).toBeInstanceOf(InvalidInvite)
  })

  test('acceptance preserves an existing owner and consumes the invite without duplicating membership', async () => {
    seedMember()
    seedInvite()
    expect(await run(acceptInviteById(acceptInput))).toMatchObject({
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
    ['org.findMemberInviteById', () => acceptInviteById(acceptInput)],
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
    failSql = (sql) => sql.startsWith('insert into "organization"')
    expect(
      await run(
        Effect.flip(createOrganizationForUser(createInput)),
      ),
    ).toMatchObject({
      _tag: 'BackendError',
      operation: 'org.createOrganization',
    })
    expect(sqlite.query('SELECT id FROM organization').all()).toHaveLength(1)
  })

  test('owner insertion failure rolls back the new organization', async () => {
    failSql = (sql) => sql.startsWith('insert into "organization_member"')
    expect(
      await run(
        Effect.flip(createOrganizationForUser(createInput)),
      ),
    ).toMatchObject({
      _tag: 'BackendError',
      operation: 'org.createOrganization',
    })
    expect(sqlite.query('SELECT id FROM organization').all()).toHaveLength(1)
    expect(
      sqlite.query('SELECT id FROM organization_member').all(),
    ).toHaveLength(0)
  })

  test('onboarding failure rolls back the organization and owner', async () => {
    failSql = (sql) => sql.startsWith('update "user"')
    expect(
      await run(
        Effect.flip(createOrganizationForUser(createInput)),
      ),
    ).toMatchObject({
      _tag: 'BackendError',
      operation: 'org.createOrganization',
    })
    expect(sqlite.query('SELECT id FROM organization').all()).toHaveLength(1)
    expect(sqlite.query('SELECT role FROM organization_member').all()).toEqual([])
  })

  test('invite consumption failure rolls back the new membership', async () => {
    seedInvite()
    failSql = (sql) => sql.startsWith('update "organization_invite"')
    expect(
      await run(Effect.flip(acceptInviteById(acceptInput))),
    ).toMatchObject({
      _tag: 'BackendError',
      operation: 'org.acceptMemberInvite',
    })
    expect(await run(getMembership('user-1', 'org-1'))).toBeNull()
    expect(inviteRow().accepted_at).toBeNull()
  })
})
