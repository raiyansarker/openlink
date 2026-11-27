import { HoldPages, type HoldPageId, type SocialPreview } from '@openlink/contracts'
import type { link } from '@openlink/db/schema'

import { LinkDelivery } from '#/server/links/delivery'
import { deriveLinkStatus } from '#/server/links/rules'
import { Visitor } from './visitor'

type LinkRow = typeof link.$inferSelect

/** What a visitor gets. `countsClick` marks a real visit to the destination. */
export type RedirectDecision =
  | { type: 'redirect'; url: string; status: number; countsClick: boolean }
  /** The destination shown in a frame, so the short URL stays in the address bar. */
  | { type: 'cloak'; url: string; title: string; countsClick: true }
  /** A share card for a link-preview crawler; never the destination. */
  | { type: 'preview'; preview: SocialPreview; title: string }
  | { type: 'hold'; page: HoldPageId }
  | { type: 'password_required' }
  | { type: 'not_found' }
  | { type: 'gone' }

export type DecideOptions = {
  now?: Date
  /** The visitor already proved they know the link password. */
  passwordVerified?: boolean
  /** Picks device and country destinations; anonymous when omitted. */
  visitor?: Visitor
}

/** UTM parameters added to a destination, never overriding ones it already has. */
export class Utm {
  static readonly KEYS = ['source', 'medium', 'campaign', 'term', 'content'] as const

  static apply(destination: string, utm: Partial<Record<(typeof Utm.KEYS)[number], string>> | null): string {
    if (!utm) return destination
    let url: URL
    try {
      url = new URL(destination)
    } catch {
      return destination
    }
    for (const key of Utm.KEYS) {
      const value = utm[key]
      const param = `utm_${key}`
      if (value && !url.searchParams.has(param)) url.searchParams.set(param, value)
    }
    return url.toString()
  }

  static parse(json: string | null): Record<string, string> | null {
    if (!json) return null
    try {
      return JSON.parse(json) as Record<string, string>
    } catch {
      return null
    }
  }
}

/**
 * The order of the rules a short link applies. Pure, so every rule is testable
 * without a database:
 *
 * 1. Expired → its after-expiry destination, the fallback, or 410.
 * 2. Not live (scheduled, paused, disabled, draft) → the fallback or 404.
 * 3. On hold → the hold page, for everyone (it stands in for the whole site).
 * 4. A link-preview crawler and a custom social card → the card. It holds only
 *    what the owner wrote, so it is safe even for password-protected links.
 * 5. Password protected → the password form until the visitor knows it.
 * 6. Otherwise → the destination, with UTM parameters. Device rules (iOS,
 *    Android) win over country rules; everyone else gets the main destination.
 *    Cloaked links show it in a frame instead of redirecting.
 */
export class RedirectRules {
  static decide(row: LinkRow, options: DecideOptions = {}): RedirectDecision {
    const now = options.now ?? new Date()
    const status = deriveLinkStatus(row, now)

    if (status === 'expired') {
      const target = row.expiredDestinationUrl ?? row.fallbackDestinationUrl
      return target ? RedirectRules.redirect(target, false) : { type: 'gone' }
    }
    if (status !== 'active') {
      return row.fallbackDestinationUrl ? RedirectRules.redirect(row.fallbackDestinationUrl, false) : { type: 'not_found' }
    }

    const delivery = LinkDelivery.fromJson(row.deliveryJson)
    if (HoldPages.isActive(delivery.hold, now)) return { type: 'hold', page: delivery.hold.page }

    const visitor = options.visitor ?? Visitor.ANONYMOUS
    if (visitor.isPreviewBot && delivery.socialPreview) {
      return { type: 'preview', preview: delivery.socialPreview, title: RedirectRules.title(row) }
    }

    if (row.passwordHash && !options.passwordVerified) return { type: 'password_required' }

    const url = Utm.apply(RedirectRules.target(row, delivery, visitor), Utm.parse(row.utmJson))
    if (delivery.cloaked) return { type: 'cloak', url, title: RedirectRules.title(row), countsClick: true }
    return RedirectRules.redirect(url, true)
  }

  /** What to call the link on pages we render for it. */
  static title(row: LinkRow): string {
    if (row.title) return row.title
    try {
      return new URL(row.destinationUrl).hostname.replace(/^www\./, '')
    } catch {
      return row.slug
    }
  }

  /** The destination for this visitor. */
  static target(row: LinkRow, delivery: LinkDelivery, visitor: Visitor): string {
    const targeting = delivery.targeting
    if (!targeting) return row.destinationUrl
    const platform = visitor.platform
    if (platform === 'ios' && targeting.ios) return targeting.ios
    if (platform === 'android' && targeting.android) return targeting.android
    const byCountry = visitor.country ? targeting.geo?.find((rule) => rule.country === visitor.country) : undefined
    return byCountry?.url ?? row.destinationUrl
  }

  private static redirect(url: string, countsClick: boolean): RedirectDecision {
    // Every short link is a 302 — temporary by design, so nothing is ever
    // permanently cached by browsers or intermediaries.
    return { type: 'redirect', url, status: 302, countsClick }
  }
}
