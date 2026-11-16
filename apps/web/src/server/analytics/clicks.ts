import { Effect } from 'effect'

import { UserAgent } from '#/lib/devices/user-agent'
import { linkClick } from '@openlink/db/schema'

import { operation } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'
import { ChannelClassifier } from './channel'
import { Bindings } from '#/server/effect/services/bindings'
import type { Visitor } from '#/server/redirect/visitor'

/** How the visitor reached the destination. */
export type ClickDelivery = 'redirect' | 'cloak'

export type ClickInput = {
  linkId: string
  /** Null for the app's own host; recorded as an empty blob. */
  domainId: string | null
  organizationId: string
  visitor?: Visitor
  delivery?: ClickDelivery
  /** The URL the visitor was sent to (after targeting and UTM). */
  destination?: string
}

/**
 * One click as an Analytics Engine data point. Blob positions are a stored
 * format: queries read them by index, so only ever append new ones.
 *
 * | blob | value                                  |
 * | ---- | -------------------------------------- |
 * | 1    | organization id                        |
 * | 2    | domain id ('' for the app host)        |
 * | 3    | link id                                |
 * | 4    | country, ISO alpha-2 ('' if unknown)   |
 * | 5    | referrer host ('' for direct)          |
 * | 6    | device: mobile, tablet, desktop        |
 * | 7    | browser name                           |
 * | 8    | operating system                       |
 * | 9    | delivery: redirect, cloak              |
 * | 10   | destination host                       |
 */
export class ClickEvent {
  constructor(readonly input: ClickInput) {}

  static device(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
    if (/iPad|Tablet/.test(userAgent) || (/Android/.test(userAgent) && !/Mobile/.test(userAgent))) return 'tablet'
    return /Mobile|iPhone|iPod|Android/.test(userAgent) ? 'mobile' : 'desktop'
  }

  static host(url: string | null | undefined): string {
    if (!url) return ''
    try {
      return new URL(url).hostname.replace(/^www\./, '')
    } catch {
      return ''
    }
  }

  toDataPoint(): AnalyticsEngineDataPoint {
    const { input } = this
    const ua = input.visitor?.userAgent ?? ''
    const described = UserAgent.describe(ua)
    return {
      blobs: [
        input.organizationId,
        input.domainId ?? '',
        input.linkId,
        input.visitor?.country ?? '',
        ClickEvent.host(input.visitor?.referrer),
        ClickEvent.device(ua),
        UserAgent.browser(ua),
        described.os,
        input.delivery ?? 'redirect',
        ClickEvent.host(input.destination),
      ],
      doubles: [1],
      indexes: [input.linkId],
    }
  }
}

/** Write a click to Analytics Engine (long-term, high volume). */
export function recordClickEvent(input: ClickInput) {
  return Effect.gen(function* () {
    const { ANALYTICS } = yield* Bindings
    const point = new ClickEvent(input).toDataPoint()
    yield* operation('analytics.recordClickEvent', () => ANALYTICS.writeDataPoint(point))
  })
}

/** The D1 copy of clicks that workspace analytics are queried from. */
export class ClickStore {
  /**
   * A stable pseudonym for a visitor within one workspace: a salted hash of IP
   * and user agent. The same person in two workspaces gets unrelated values,
   * and neither input is stored.
   */
  static visitorHash(secret: string, organizationId: string, visitor: Visitor | undefined) {
    return operation('analytics.visitorHash', async () => {
      const data = new TextEncoder().encode(`visitor|${secret}|${organizationId}|${visitor?.ip ?? ''}|${visitor?.userAgent ?? ''}`)
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data))
      return Buffer.from(digest.subarray(0, 12)).toString('base64url')
    })
  }

  static record(input: ClickInput, now = new Date()) {
    return Effect.gen(function* () {
      const db = yield* Db
      const { BETTER_AUTH_SECRET } = yield* Bindings
      const visitor = input.visitor
      const ua = visitor?.userAgent ?? ''
      const referrerHost = ClickEvent.host(visitor?.referrer) || null
      const visitorHash = yield* ClickStore.visitorHash(BETTER_AUTH_SECRET, input.organizationId, visitor)
      yield* operation('analytics.storeClick', () =>
        db.insert(linkClick).values({
          id: crypto.randomUUID(),
          organizationId: input.organizationId,
          linkId: input.linkId,
          domainId: input.domainId,
          occurredAt: now,
          visitorHash,
          channel: ChannelClassifier.classify(referrerHost, visitor?.fromQr ?? false),
          referrerHost,
          country: visitor?.country ?? null,
          city: visitor?.place.city ?? null,
          latitude: visitor?.place.latitude ?? null,
          longitude: visitor?.place.longitude ?? null,
          device: ClickEvent.device(ua),
          browser: UserAgent.browser(ua),
          os: UserAgent.describe(ua).os,
          delivery: input.delivery ?? 'redirect',
          destinationHost: ClickEvent.host(input.destination) || null,
        }),
      )
    })
  }
}
