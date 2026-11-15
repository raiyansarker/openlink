import { customDomain, link } from '@openlink/db/schema'
import { and, eq, isNull, lt, or, sql } from 'drizzle-orm'
import { Effect } from 'effect'

import { recordClickEvent } from '#/server/analytics/clicks'
import { operation } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'
import { verifyLinkPassword } from '#/server/links/password'
import { decideRedirect, type RedirectDecision } from './decide'

export type ResolveOutcome = RedirectDecision | { type: 'password_invalid' }

/** Lowercase the host and drop any port or trailing dot. */
export function normalizeHost(host: string) {
  return host.trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '')
}

export function findActiveDomainByHost(host: string) {
  return Effect.gen(function* () {
    const db = yield* Db
    const [row] = yield* operation('redirect.findDomain', () =>
      db
        .select()
        .from(customDomain)
        .where(and(eq(customDomain.hostname, normalizeHost(host)), eq(customDomain.readiness, 'active')))
        .limit(1),
    )
    return row ?? null
  })
}

/** Count a click unless the link has reached its limit; false means the limit was hit. */
function claimClick(row: typeof link.$inferSelect) {
  return Effect.gen(function* () {
    const db = yield* Db
    const claimed = yield* operation('redirect.claimClick', () =>
      db
        .update(link)
        .set({ clickCount: sql`${link.clickCount} + 1` })
        .where(and(eq(link.id, row.id), or(isNull(link.maxClicks), lt(link.clickCount, link.maxClicks))))
        .returning({ id: link.id }),
    )
    return claimed.length > 0
  })
}

/**
 * Resolve a public short-link request (`host` + `slug`) to an outcome.
 * Unknown hosts and slugs both resolve to `not_found`. Analytics failures never
 * block the redirect.
 */
/**
 * `appHost` is the app's own host: links there have no custom domain (the
 * default domain every workspace shares).
 */
export function resolveRedirect(input: { host: string; slug: string; password?: string; appHost?: string | null }) {
  return Effect.gen(function* () {
    const db = yield* Db
    const onAppHost = !!input.appHost && normalizeHost(input.host) === normalizeHost(input.appHost)
    const domain = onAppHost ? null : yield* findActiveDomainByHost(input.host)
    if (!onAppHost && !domain) return { type: 'not_found' } as ResolveOutcome

    const [row] = yield* operation('redirect.findLink', () =>
      db
        .select()
        .from(link)
        .where(and(domain ? eq(link.domainId, domain.id) : isNull(link.domainId), eq(link.slug, input.slug)))
        .limit(1),
    )
    if (!row) return { type: 'not_found' } as ResolveOutcome

    let passwordVerified = false
    if (row.passwordHash && input.password !== undefined) {
      passwordVerified = yield* verifyLinkPassword(input.password, row.passwordHash)
      if (!passwordVerified) return { type: 'password_invalid' } as ResolveOutcome
    }

    const decision = decideRedirect(row, { passwordVerified })
    if (decision.type !== 'redirect' || !decision.countsClick) return decision

    const claimed = yield* claimClick(row)
    if (!claimed) {
      return decideRedirect({ ...row, clickCount: row.maxClicks ?? row.clickCount }) as ResolveOutcome
    }

    yield* recordClickEvent({
      linkId: row.id,
      domainId: row.domainId,
      organizationId: row.organizationId,
    }).pipe(Effect.ignore)

    return decision as ResolveOutcome
  })
}
