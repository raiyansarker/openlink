import type { UpdateLinkRequest } from '@openlink/contracts'
import { link } from '@openlink/db/schema'
import { and, eq } from 'drizzle-orm'
import { Data, Effect } from 'effect'

import { operation } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'
import { LinkDelivery, type LinkDeliverySettings } from './delivery'
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
      /\blink\.slug\b|\blink_domain_slug_unique\b|\blink_default_slug_unique\b/.test(cause.message)
    ) {
      return true
    }
    cause = cause.cause
  }
  return false
}

export function createLinkRecord(input: {
  organizationId: string
  /** Null for the app's own host. */
  domainId: string | null
  /** Null when created through an API key. */
  userId: string | null
  slug?: string
  folderId?: string | null
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
} & LinkDeliverySettings) {
  return Effect.gen(function* () {
    const db = yield* Db
    const now = new Date()
    const slug = input.slug ?? generateSlug()
    const id = crypto.randomUUID()
    const passwordHash = input.password ? yield* hashLinkPassword(input.password) : null

    const [row] = yield* operation('links.create', () =>
      db
        .insert(link)
        .values({
          id,
          organizationId: input.organizationId,
          domainId: input.domainId,
          slug,
          folderId: input.folderId ?? null,
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
          deliveryJson: LinkDelivery.from({
            hold: input.hold,
            targeting: input.targeting,
            cloaked: input.cloaked,
            socialPreview: input.socialPreview,
          }).toJson(),
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

/** A link of this workspace by id, whatever domain it is on. */
export function getLinkInOrganization(organizationId: string, linkId: string) {
  return Effect.gen(function* () {
    const db = yield* Db
    const rows = yield* operation('links.getInOrganization', () =>
      db.select().from(link).where(and(eq(link.organizationId, organizationId), eq(link.id, linkId))).limit(1),
    )
    return rows.at(0) ?? null
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

/** How an update field applies: `undefined` keeps the stored value, `null` clears it. */
export class Patch {
  static value<T>(next: T | null | undefined, current: T | null): T | null {
    return next === undefined ? current : next
  }

  static map<I, O>(next: I | null | undefined, current: O | null, convert: (value: I) => O | null): O | null {
    if (next === undefined) return current
    return next === null ? null : convert(next)
  }

  /** Dates from ISO strings; an empty string keeps the stored date, as it always has. */
  static date(next: string | null | undefined, current: Date | null): Date | null {
    return next === '' ? current : Patch.map(next, current, (iso) => new Date(iso))
  }

  /** An empty object stores as nothing, so "no UTM" has one representation. */
  static jsonOrNull(value: object): string | null {
    return Object.keys(value).length > 0 ? JSON.stringify(value) : null
  }
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
          ? yield* hashLinkPassword(input.password)
          : existing.passwordHash

    const [updated] = yield* operation('links.update', () =>
      db
        .update(link)
        .set({
          folderId: Patch.value(input.folderId, existing.folderId),
          destinationUrl: input.destinationUrl ?? existing.destinationUrl,
          title: input.title ?? existing.title,
          description: Patch.value(input.description, existing.description),
          redirectStatus: input.redirectStatus ?? existing.redirectStatus,
          status: input.status ?? existing.status,
          enabled: input.enabled ?? existing.enabled,
          activateAt: Patch.date(input.activateAt, existing.activateAt),
          expiresAt: Patch.date(input.expiresAt, existing.expiresAt),
          maxClicks: Patch.value(input.maxClicks, existing.maxClicks),
          passwordHash,
          expiredDestinationUrl: Patch.value(input.expiredDestinationUrl, existing.expiredDestinationUrl),
          fallbackDestinationUrl: Patch.value(input.fallbackDestinationUrl, existing.fallbackDestinationUrl),
          tagsJson: input.tags ? JSON.stringify(input.tags) : existing.tagsJson,
          utmJson: Patch.map(input.utm, existing.utmJson, Patch.jsonOrNull),
          metadataJson: Patch.map(input.metadata, existing.metadataJson, Patch.jsonOrNull),
          deliveryJson: LinkDelivery.fromJson(existing.deliveryJson).apply(input).toJson(),
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
