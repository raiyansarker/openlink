import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import type { OpenLinkDb } from '@openlink/db'
import { link } from '@openlink/db/schema'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Effect } from 'effect'

import { BackendError } from '#/server/effect/operations'
import { Db, type Db as DbService } from '#/server/effect/services/db'
import { verifyLinkPassword } from './password'

const verify = (password: string, stored: string | null) =>
  Effect.runPromise(verifyLinkPassword(password, stored))
import {
  SlugConflict,
  createLinkRecord,
  deleteLinkRecord,
  getLinkInDomain,
  listLinksForDomain,
  updateLinkRecord,
} from './service'

const databases: Database[] = []
afterEach(() => {
  mock.restore()
  for (const database of databases.splice(0)) database.close()
})

function setup() {
  const sqlite = new Database(':memory:')
  databases.push(sqlite)
  sqlite.exec(`
    CREATE TABLE link (
      id TEXT PRIMARY KEY NOT NULL,
      organization_id TEXT NOT NULL,
      domain_id TEXT NOT NULL,
      slug TEXT NOT NULL,
      alias TEXT,
      title TEXT,
      description TEXT,
      destination_url TEXT NOT NULL,
      redirect_status INTEGER NOT NULL DEFAULT 302,
      status TEXT NOT NULL DEFAULT 'active',
      enabled INTEGER NOT NULL DEFAULT 1,
      activate_at INTEGER,
      expires_at INTEGER,
      max_clicks INTEGER,
      click_count INTEGER NOT NULL DEFAULT 0,
      password_hash TEXT,
      expired_destination_url TEXT,
      fallback_destination_url TEXT,
      tags_json TEXT NOT NULL DEFAULT '[]',
      utm_json TEXT,
      metadata_json TEXT,
      created_by_user_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE (domain_id, slug)
    )
  `)
  const adapter = drizzle(sqlite)
  // Both adapters expose the same SQLite query builders used by the service.
  const db = adapter as unknown as OpenLinkDb
  const run = <A, E>(effect: Effect.Effect<A, E, DbService>) =>
    Effect.runPromise(effect.pipe(Effect.provideService(Db, db)))
  const seed = (overrides: Partial<typeof link.$inferInsert> = {}) =>
    adapter.insert(link).values({
      id: crypto.randomUUID(),
      organizationId: 'org-1',
      domainId: 'domain-1',
      slug: crypto.randomUUID(),
      destinationUrl: 'https://example.com/original',
      title: 'Original title',
      description: 'Original description',
      redirectStatus: 307,
      status: 'paused',
      enabled: true,
      activateAt: new Date('2024-01-01'),
      expiresAt: new Date('2030-01-01'),
      maxClicks: 100,
      passwordHash: 'existing-hash',
      expiredDestinationUrl: 'https://example.com/expired',
      fallbackDestinationUrl: 'https://example.com/fallback',
      tagsJson: '["original"]',
      utmJson: '{"source":"original"}',
      metadataJson: '{"original":true}',
      createdByUserId: 'user-1',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    }).returning().get()
  return { db, adapter, run, seed }
}

const createInput = {
  organizationId: 'org-1',
  domainId: 'domain-1',
  userId: 'user-1',
  destinationUrl: 'https://example.com/new',
}

describe('Effect-native link services', () => {
  test('all services defer database and password work until execution', async () => {
    const { db, run, seed } = setup()
    const existing = seed()
    const insert = spyOn(db, 'insert')
    const select = spyOn(db, 'select')
    const update = spyOn(db, 'update')
    const remove = spyOn(db, 'delete')
    const hash = spyOn(crypto.subtle, 'deriveBits')

    const createEffect = createLinkRecord({ ...createInput, password: 'secret' })
    const listEffect = listLinksForDomain('domain-1')
    const getEffect = getLinkInDomain('domain-1', existing.id)
    const updateEffect = updateLinkRecord(existing, { password: 'replacement' })
    const deleteEffect = deleteLinkRecord(existing.id)

    for (const primitive of [insert, select, update, remove, hash]) {
      expect(primitive).not.toHaveBeenCalled()
    }

    await run(createEffect)
    expect(insert).toHaveBeenCalledTimes(1)
    expect(hash).toHaveBeenCalledTimes(1)
    expect(await run(listEffect)).toHaveLength(2)
    expect(await run(getEffect)).toEqual(existing)
    await run(updateEffect)
    expect(update).toHaveBeenCalledTimes(1)
    expect(hash).toHaveBeenCalledTimes(2)
    expect(await run(deleteEffect)).toBeUndefined()
    expect(remove).toHaveBeenCalledTimes(1)
  })

  test('creation preserves defaults, generates fresh IDs/slugs, and runs afresh', async () => {
    const { run } = setup()
    const effect = createLinkRecord(createInput)
    const before = new Date()
    const first = await run(effect)
    const second = await run(effect)
    expect(first).toMatchObject({
      organizationId: createInput.organizationId,
      domainId: createInput.domainId,
      destinationUrl: createInput.destinationUrl,
      createdByUserId: 'user-1',
      redirectStatus: 302,
      status: 'active',
      enabled: true,
      passwordHash: null,
      tagsJson: '[]',
      utmJson: null,
      metadataJson: null,
    })
    expect(first.id).not.toBe(second.id)
    expect(first.slug).not.toBe(second.slug)
    expect(first.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(first.updatedAt).toEqual(first.createdAt)
  })

  test('creation preserves optional fields, scheduling, JSON and password hashing', async () => {
    const { run } = setup()
    const activateAt = new Date(Date.now() + 60_000)
    const expiresAt = new Date(Date.now() + 120_000)
    const row = await run(createLinkRecord({
      ...createInput,
      slug: 'custom',
      title: '',
      description: 'Description',
      redirectStatus: 308,
      activateAt,
      expiresAt,
      maxClicks: 10,
      password: 'secret',
      expiredDestinationUrl: 'https://example.com/expired',
      fallbackDestinationUrl: 'https://example.com/fallback',
      tags: ['one', 'two'],
      utm: { source: 'test' },
      metadata: { nested: { enabled: true } },
    }))
    expect(row).toMatchObject({
      slug: 'custom', title: '', description: 'Description', redirectStatus: 308,
      status: 'scheduled', activateAt, expiresAt, maxClicks: 10,
      expiredDestinationUrl: 'https://example.com/expired',
      fallbackDestinationUrl: 'https://example.com/fallback',
      tagsJson: '["one","two"]', utmJson: '{"source":"test"}',
      metadataJson: '{"nested":{"enabled":true}}',
    })
    expect(await verify('secret', row.passwordHash)).toBe(true)
  })

  test('reads are scoped to the domain and missing links return null', async () => {
    const { run, seed } = setup()
    const first = seed()
    const second = seed()
    const other = seed({ domainId: 'domain-2' })
    const rows = await run(listLinksForDomain('domain-1'))
    expect(rows).toHaveLength(2)
    expect(rows).toEqual(expect.arrayContaining([first, second]))
    expect(await run(listLinksForDomain('missing'))).toEqual([])
    expect(await run(getLinkInDomain('domain-1', first.id))).toEqual(first)
    expect(await run(getLinkInDomain('domain-1', other.id))).toBeNull()
    expect(await run(getLinkInDomain('domain-1', 'missing'))).toBeNull()
  })

  test('slug uniqueness is per domain and fails with the typed domain error', async () => {
    const { run, seed } = setup()
    seed({ slug: 'taken' })
    const error = await run(Effect.flip(createLinkRecord({ ...createInput, slug: 'taken' })))
    expect(error).toBeInstanceOf(SlugConflict)
    expect(error._tag).toBe('SlugConflict')
    expect(error.cause).toBeInstanceOf(Error)
    expect(await run(createLinkRecord({
      ...createInput, domainId: 'domain-2', slug: 'taken',
    }))).toMatchObject({ domainId: 'domain-2', slug: 'taken' })
  })

  test('recognizes a slug constraint nested inside a Drizzle/D1 error', async () => {
    const { db, run } = setup()
    const cause = new Error('Failed query', {
      cause: new Error('D1_ERROR: UNIQUE constraint failed: link.domain_id, link.slug: SQLITE_CONSTRAINT'),
    })
    spyOn(db, 'insert').mockImplementation(() => { throw cause })
    const error = await run(Effect.flip(createLinkRecord(createInput)))
    expect(error).toBeInstanceOf(SlugConflict)
    expect(error.cause).toBe(cause)
  })

  test('unrelated UNIQUE failures remain BackendErrors, not slug conflicts', async () => {
    const { db, run } = setup()
    const cause = new Error('UNIQUE constraint failed: link.id')
    spyOn(db, 'insert').mockImplementation(() => { throw cause })
    const error = await run(Effect.flip(createLinkRecord(createInput)))
    expect(error).toBeInstanceOf(BackendError)
    expect(error).toMatchObject({ operation: 'links.create', cause })
  })

  test('omitted update fields preserve every value except updatedAt', async () => {
    const { run, seed } = setup()
    const existing = seed()
    const before = new Date()
    const updated = await run(updateLinkRecord(existing, {}))
    expect(updated).toEqual({ ...existing, updatedAt: updated.updatedAt })
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(updated.updatedAt).not.toEqual(existing.updatedAt)
    expect(await run(getLinkInDomain(existing.domainId, existing.id))).toEqual(updated)
  })

  test('update preserves false, empty strings/collections, dates and password clear precedence', async () => {
    const { run, seed } = setup()
    const existing = seed()
    const untouched = seed()
    const hash = spyOn(crypto.subtle, 'deriveBits')
    const activateAt = new Date('2027-01-01')
    const expiresAt = new Date('2028-01-01')
    const updated = await run(updateLinkRecord(existing, {
      destinationUrl: 'https://example.com/updated',
      title: '', description: '', redirectStatus: 301, status: 'disabled', enabled: false,
      activateAt: activateAt.toISOString(), expiresAt: expiresAt.toISOString(), maxClicks: 1,
      clearPassword: true, password: 'must-not-be-hashed',
      expiredDestinationUrl: 'https://example.com/expired-new',
      fallbackDestinationUrl: 'https://example.com/fallback-new',
      tags: [], utm: {}, metadata: {},
    }))
    expect(updated).toMatchObject({
      id: existing.id, slug: existing.slug, createdAt: existing.createdAt,
      destinationUrl: 'https://example.com/updated',
      title: '', description: '', redirectStatus: 301, status: 'disabled', enabled: false,
      activateAt, expiresAt, maxClicks: 1, passwordHash: null,
      expiredDestinationUrl: 'https://example.com/expired-new',
      fallbackDestinationUrl: 'https://example.com/fallback-new',
      tagsJson: '[]', utmJson: '{}', metadataJson: '{}',
    })
    expect(hash).not.toHaveBeenCalled()
    expect(await run(getLinkInDomain(untouched.domainId, untouched.id))).toEqual(untouched)
  })

  test('update hashes replacement passwords and retains truthy date fallback semantics', async () => {
    const { run, seed } = setup()
    const existing = seed()
    const updated = await run(updateLinkRecord(existing, {
      password: 'replacement', clearPassword: false, activateAt: '', expiresAt: '',
      tags: ['new'], utm: { source: 'new' }, metadata: { nested: [1, true] },
    }))
    expect(updated.passwordHash).not.toBe(existing.passwordHash)
    expect(await verify('replacement', updated.passwordHash)).toBe(true)
    expect(updated).toMatchObject({
      activateAt: existing.activateAt, expiresAt: existing.expiresAt,
      tagsJson: '["new"]', utmJson: '{"source":"new"}',
      metadataJson: '{"nested":[1,true]}',
    })
  })

  test('delete removes only the requested record and tolerates a missing record', async () => {
    const { run, seed } = setup()
    const existing = seed()
    const untouched = seed()
    await run(deleteLinkRecord(existing.id))
    expect(await run(getLinkInDomain(existing.domainId, existing.id))).toBeNull()
    expect(await run(getLinkInDomain(untouched.domainId, untouched.id))).toEqual(untouched)
    expect(await run(deleteLinkRecord('missing'))).toBeUndefined()
  })

  for (const method of ['insert', 'select', 'update', 'delete'] as const) {
    test(`${method} primitive failures retain the operation and original cause`, async () => {
      const { db, run, seed } = setup()
      const existing = seed()
      const cause = new Error('database unavailable')
      spyOn(db, method).mockImplementation(() => { throw cause })
      const effects = method === 'insert'
        ? [[createLinkRecord(createInput), 'links.create']] as const
        : method === 'select'
          ? [[listLinksForDomain('domain-1'), 'links.list'],
             [getLinkInDomain('domain-1', existing.id), 'links.get']] as const
          : method === 'update'
            ? [[updateLinkRecord(existing, {}), 'links.update']] as const
            : [[deleteLinkRecord(existing.id), 'links.delete']] as const
      for (const [effect, operation] of effects) {
        const error = await run(Effect.flip(effect))
        expect(error).toBeInstanceOf(BackendError)
        expect(error).toMatchObject({ _tag: 'BackendError', operation, cause })
      }
    })
  }

  test('password failures are typed independently and prevent create/update writes', async () => {
    const { db, run, seed } = setup()
    const existing = seed()
    const cause = new Error('password primitive failed')
    const insert = spyOn(db, 'insert')
    const update = spyOn(db, 'update')
    spyOn(crypto.subtle, 'deriveBits').mockRejectedValue(cause)
    const effects = [
      createLinkRecord({ ...createInput, password: 'secret' }),
      updateLinkRecord(existing, { password: 'replacement' }),
    ]
    for (const effect of effects) {
      const error = await run(Effect.flip(effect))
      expect(error).toBeInstanceOf(BackendError)
      expect(error).toMatchObject({ operation: 'password.deriveBits', cause })
    }
    expect(insert).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
    expect(await run(getLinkInDomain(existing.domainId, existing.id))).toEqual(existing)
  })
})
