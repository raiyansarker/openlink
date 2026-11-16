import { customDomain, link } from '@openlink/db/schema'
import { and, eq, isNull, lt, or, sql } from 'drizzle-orm'
import { Effect } from 'effect'

import { recordClickEvent } from '#/server/analytics/clicks'
import { operation } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'
import { verifyLinkPassword } from '#/server/links/password'
import { Bindings } from '#/server/effect/services/bindings'
import { PasswordGate } from './password-gate'
import { RedirectRules, type RedirectDecision } from './decide'
import { WorkspaceEvents } from '@openlink/contracts'
import { EventBus } from '#/server/events/bus'
import { FrameCheck } from './frame-check'
import { Visitor } from './visitor'

/** How events name a link. */
class LinkSubject {
  static of(row: typeof link.$inferSelect) {
    return { type: 'link', id: row.id, label: row.title || row.slug }
  }
}

export type ResolveOutcome =
  | RedirectDecision
  /** The right password: remember it, then reopen the link with a plain GET. */
  | { type: 'password_accepted'; setCookie: string }
  | { type: 'password_invalid' }
  | { type: 'password_rate_limited' }

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

/** Count a click unless the link has reached its limit. Resolves to the new count, or null at the limit. */
function claimClick(row: typeof link.$inferSelect) {
  return Effect.gen(function* () {
    const db = yield* Db
    const claimed = yield* operation('redirect.claimClick', () =>
      db
        .update(link)
        .set({ clickCount: sql`${link.clickCount} + 1` })
        .where(and(eq(link.id, row.id), or(isNull(link.maxClicks), lt(link.clickCount, link.maxClicks))))
        .returning({ clickCount: link.clickCount }),
    )
    return claimed[0]?.clickCount ?? null
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
export function resolveRedirect(input: {
  host: string
  slug: string
  password?: string
  appHost?: string | null
  visitor?: Visitor
  /** The request's Cookie header, for remembered passwords. */
  cookieHeader?: string | null
  /** For capping password guesses per visitor. */
  clientIp?: string | null
  /** Whether a destination can be framed, for cloaked links; real check by default. */
  frameable?: (url: string) => Effect.Effect<boolean>
}) {
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
    if (row.passwordHash) {
      const { BETTER_AUTH_SECRET, LINK_PASSWORD_LIMITER } = yield* Bindings
      if (input.password !== undefined) {
        if (!(yield* PasswordGate.allowAttempt(LINK_PASSWORD_LIMITER, row, input.clientIp ?? null))) {
          yield* EventBus.publish(
            EventBus.create('link.password_locked', row.organizationId, { subject: LinkSubject.of(row) }),
          )
          return { type: 'password_rate_limited' } as ResolveOutcome
        }
        if (!(yield* verifyLinkPassword(input.password, row.passwordHash))) return { type: 'password_invalid' } as ResolveOutcome
        // Never answer the POST with the destination: a 307/308 link would re-send the password there.
        return { type: 'password_accepted', setCookie: yield* PasswordGate.remember(row, BETTER_AUTH_SECRET) } as ResolveOutcome
      } else {
        passwordVerified = yield* PasswordGate.isRemembered(row, input.cookieHeader ?? null, BETTER_AUTH_SECRET)
      }
    }

    const visitor = input.visitor ?? Visitor.ANONYMOUS
    let decision = RedirectRules.decide(row, { passwordVerified, visitor })
    if (decision.type === 'cloak' && !(yield* (input.frameable ?? FrameCheck.frameable)(decision.url))) {
      decision = { type: 'redirect', url: decision.url, status: row.redirectStatus, countsClick: true }
    }
    if (!('countsClick' in decision) || !decision.countsClick) return decision

    const clickCount = yield* claimClick(row)
    if (clickCount === null) {
      return RedirectRules.decide({ ...row, clickCount: row.maxClicks ?? row.clickCount }) as ResolveOutcome
    }

    yield* recordClickEvent({
      linkId: row.id,
      domainId: row.domainId,
      organizationId: row.organizationId,
      visitor,
      delivery: decision.type === 'cloak' ? 'cloak' : 'redirect',
      destination: decision.url,
    }).pipe(Effect.ignore)

    const subject = LinkSubject.of(row)
    yield* EventBus.publish(
      EventBus.create('click.recorded', row.organizationId, {
        subject,
        data: { clickCount, country: visitor.country, platform: visitor.platform, delivery: decision.type },
      }),
    )
    if (WorkspaceEvents.isClickMilestone(clickCount)) {
      yield* EventBus.publish(EventBus.create('click.milestone', row.organizationId, { subject, data: { clickCount } }))
    }

    return decision as ResolveOutcome
  })
}
