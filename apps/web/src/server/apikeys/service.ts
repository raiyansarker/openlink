import { apiKey } from '@openlink/db/schema'
import { and, eq } from 'drizzle-orm'
import { Effect } from 'effect'

import { operation } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'
import { ApiKeyNotFound } from './errors'
import { generateApiKey, hashApiKey } from './secret'

export type ApiKeyRow = typeof apiKey.$inferSelect
export type ApiKeyRole = ApiKeyRow['role']

/** The identity a request authenticated with an API key acts as. */
export type ApiKeyPrincipal = {
  id: string
  organizationId: string
  role: ApiKeyRole
  name: string
}

/** `lastUsedAt` is refreshed at most this often, to avoid a write on every request. */
export const LAST_USED_RESOLUTION_MS = 5 * 60_000

export function listApiKeys(organizationId: string) {
  return Effect.gen(function* () {
    const db = yield* Db
    return yield* operation('apiKeys.list', () =>
      db.select().from(apiKey).where(eq(apiKey.organizationId, organizationId)).orderBy(apiKey.createdAt),
    )
  })
}

/** Returns the stored row plus the one-time plaintext secret. */
export function createApiKey(input: {
  organizationId: string
  name: string
  role: ApiKeyRole
  createdByUserId: string
}) {
  return Effect.gen(function* () {
    const db = yield* Db
    const { secret, prefix, hash } = generateApiKey()
    const [row] = yield* operation('apiKeys.create', () =>
      db
        .insert(apiKey)
        .values({
          id: crypto.randomUUID(),
          organizationId: input.organizationId,
          name: input.name.trim(),
          prefix,
          keyHash: hash,
          role: input.role,
          createdByUserId: input.createdByUserId,
          createdAt: new Date(),
        })
        .returning(),
    )
    return { row: row!, secret }
  })
}

export function updateApiKeyRole(input: { organizationId: string; keyId: string; role: ApiKeyRole }) {
  return Effect.gen(function* () {
    const db = yield* Db
    const [existing] = yield* operation('apiKeys.find', () =>
      db
        .select()
        .from(apiKey)
        .where(and(eq(apiKey.id, input.keyId), eq(apiKey.organizationId, input.organizationId)))
        .limit(1),
    )
    if (!existing) return yield* Effect.fail(new ApiKeyNotFound())
    yield* operation('apiKeys.updateRole', () =>
      db.update(apiKey).set({ role: input.role }).where(eq(apiKey.id, existing.id)),
    )
    return { row: { ...existing, role: input.role }, previousRole: existing.role }
  })
}

/** Revoked keys stop working immediately: they no longer exist to authenticate against. */
export function revokeApiKey(organizationId: string, keyId: string) {
  return Effect.gen(function* () {
    const db = yield* Db
    const deleted = yield* operation('apiKeys.revoke', () =>
      db
        .delete(apiKey)
        .where(and(eq(apiKey.id, keyId), eq(apiKey.organizationId, organizationId)))
        .returning(),
    )
    if (deleted.length === 0) return yield* Effect.fail(new ApiKeyNotFound())
    return deleted[0]!
  })
}

/** Resolve a presented secret to its principal, or null when it is unknown. */
export function authenticateApiKey(secret: string, now = new Date()) {
  return Effect.gen(function* () {
    const db = yield* Db
    const [row] = yield* operation('apiKeys.authenticate', () =>
      db.select().from(apiKey).where(eq(apiKey.keyHash, hashApiKey(secret))).limit(1),
    )
    if (!row) return null

    const stale = !row.lastUsedAt || now.getTime() - row.lastUsedAt.getTime() > LAST_USED_RESOLUTION_MS
    if (stale) {
      // Bookkeeping must never reject an otherwise valid credential.
      yield* operation('apiKeys.touch', () =>
        db.update(apiKey).set({ lastUsedAt: now }).where(eq(apiKey.id, row.id)),
      ).pipe(Effect.ignore)
    }
    return { id: row.id, organizationId: row.organizationId, role: row.role, name: row.name } satisfies ApiKeyPrincipal
  })
}
