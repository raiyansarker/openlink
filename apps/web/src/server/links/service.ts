import type { UpdateLinkRequest } from '@openlink/contracts'
import { link } from '@openlink/db/schema'
import { and, eq } from 'drizzle-orm'
import { Data, Effect } from 'effect'

import { operation } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'
import { hashLinkPassword } from './password'
import { generateSlug } from './rules'

export { deriveLinkStatus, generateSlug } from './rules'

export class SlugConflict extends Data.TaggedError('SlugConflict')<{
  cause: unknown
}> {}

function isSlugConflict(cause: unknown): boolean {
  const seen = new Set<unknown>()
  while (cause instanceof Error && !seen.has(cause)) {
    seen.add(cause)
    if (
      /UNIQUE/i.test(cause.message) &&
      /\blink\.slug\b|\blink_domain_slug_unique\b/.test(cause.message)
    ) {
      return true
    }
    cause = cause.cause
  }
  return false
}

export function createLinkRecord(input: {
  organizationId: string
  domainId: string
  userId: string
  slug?: string
  destinationUrl: string
  title?: string
  description?: string
  redirectStatus?: number
  activateAt?: Date
  expiresAt?: Date
  maxClicks?: number
  password?: string
  expiredDestinationUrl?: string
  fallbackDestinationUrl?: string
  tags?: string[]
  utm?: Record<string, string>
  metadata?: Record<string, unknown>
}) {
  return Effect.gen(function* () {
    const db = yield* Db
    const now = new Date()
    const slug = input.slug ?? generateSlug()
    const id = crypto.randomUUID()
    const passwordHash = input.password
      ? yield* operation('links.hashPassword', () => hashLinkPassword(input.password!))
      : null

    const [row] = yield* operation('links.create', () =>
      db
        .insert(link)
        .values({
          id,
          organizationId: input.organizationId,
          domainId: input.domainId,
          slug,
          title: input.title,
          description: input.description,
          destinationUrl: input.destinationUrl,
          redirectStatus: input.redirectStatus ?? 302,
          status: input.activateAt && input.activateAt > now ? 'scheduled' : 'active',
          enabled: true,
          activateAt: input.activateAt,
          expiresAt: input.expiresAt,
          maxClicks: input.maxClicks,
          passwordHash,
          expiredDestinationUrl: input.expiredDestinationUrl,
          fallbackDestinationUrl: input.fallbackDestinationUrl,
          tagsJson: JSON.stringify(input.tags ?? []),
          utmJson: input.utm ? JSON.stringify(input.utm) : null,
          metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
          createdByUserId: input.userId,
          createdAt: now,
          updatedAt: now,
        })
        .returning(),
    ).pipe(
      Effect.mapError((error) =>
        isSlugConflict(error.cause) ? new SlugConflict({ cause: error.cause }) : error,
      ),
    )

    return row!
  })
}

export function listLinksForDomain(domainId: string) {
  return Effect.gen(function* () {
    const db = yield* Db
    return yield* operation('links.list', () =>
      db.select().from(link).where(eq(link.domainId, domainId)),
    )
  })
}

export function getLinkInDomain(domainId: string, linkId: string) {
  return Effect.gen(function* () {
    const db = yield* Db
    const rows = yield* operation('links.get', () =>
      db
        .select()
        .from(link)
        .where(and(eq(link.domainId, domainId), eq(link.id, linkId)))
        .limit(1),
    )
    return rows.at(0) ?? null
  })
}

export function updateLinkRecord(
  existing: typeof link.$inferSelect,
  input: typeof UpdateLinkRequest.infer,
) {
  return Effect.gen(function* () {
    const db = yield* Db
    const now = new Date()
    const passwordHash =
      input.clearPassword === true
        ? null
        : input.password
          ? yield* operation('links.hashPassword', () => hashLinkPassword(input.password!))
          : existing.passwordHash

    const [updated] = yield* operation('links.update', () =>
      db
        .update(link)
        .set({
          destinationUrl: input.destinationUrl ?? existing.destinationUrl,
          title: input.title ?? existing.title,
          description: input.description ?? existing.description,
          redirectStatus: input.redirectStatus ?? existing.redirectStatus,
          status: input.status ?? existing.status,
          enabled: input.enabled ?? existing.enabled,
          activateAt: input.activateAt ? new Date(input.activateAt) : existing.activateAt,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : existing.expiresAt,
          maxClicks: input.maxClicks ?? existing.maxClicks,
          passwordHash,
          expiredDestinationUrl: input.expiredDestinationUrl ?? existing.expiredDestinationUrl,
          fallbackDestinationUrl: input.fallbackDestinationUrl ?? existing.fallbackDestinationUrl,
          tagsJson: input.tags ? JSON.stringify(input.tags) : existing.tagsJson,
          utmJson: input.utm ? JSON.stringify(input.utm) : existing.utmJson,
          metadataJson: input.metadata ? JSON.stringify(input.metadata) : existing.metadataJson,
          updatedAt: now,
        })
        .where(eq(link.id, existing.id))
        .returning(),
    )
    return updated!
  })
}

export function deleteLinkRecord(linkId: string) {
  return Effect.gen(function* () {
    const db = yield* Db
    yield* operation('links.delete', () => db.delete(link).where(eq(link.id, linkId)))
  })
}
