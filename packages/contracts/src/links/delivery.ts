import { type } from 'arktype'

import { HttpUrl } from '../schema-utils'

/**
 * How a link is delivered beyond a plain redirect: hold pages, device and
 * country targeting, cloaking, and the card shown when the link is shared.
 */

export const HoldPageId = type("'bad-gateway' | 'service-unavailable' | 'gateway-timeout' | 'maintenance'")
export type HoldPageId = typeof HoldPageId.infer

export const LinkHold = type({
  page: HoldPageId,
  /** ISO time the hold lifts on its own; absent means until released by hand. */
  'releaseAt?': 'string',
})
export type LinkHold = typeof LinkHold.infer

export const GeoTargetRule = type({
  /** ISO 3166-1 alpha-2 code, e.g. "US". */
  country: /^[A-Z]{2}$/,
  url: HttpUrl,
})

export const LinkTargeting = type({
  'ios?': HttpUrl,
  'android?': HttpUrl,
  'geo?': GeoTargetRule.array().atMostLength(50),
})
export type LinkTargeting = typeof LinkTargeting.infer

/** An image we host (uploaded through the app) or any public HTTPS image. */
export const PreviewImageUrl = HttpUrl.or(/^\/api\/media\/previews\/[A-Za-z0-9_-]+\/[A-Za-z0-9-]+\.(png|jpg|gif|webp)$/)

/**
 * A share-card image file: a PNG, JPEG, WebP or GIF of at most 5 MB, sent as a file field
 * in a `multipart/form-data` body. 1200 × 630 px looks best.
 */
export const LinkPreviewImage = type.instanceOf(Blob)

export const SocialPreview = type({
  'title?': 'string <= 120',
  'description?': 'string <= 300',
  'imageUrl?': PreviewImageUrl,
})
export type SocialPreview = typeof SocialPreview.infer

type HoldPageCopy = {
  label: string
  heading: string
  /** Footer under the rule on web-server style pages. */
  footer?: string
  /** Body copy on friendly pages. */
  body?: string
  /** Looks like a raw web-server error rather than a branded page. */
  isServerStyle: boolean
}

/** What each hold page says. Shared so the editor preview and the live page match. */
export class HoldPages {
  static readonly ALL: Readonly<Record<HoldPageId, HoldPageCopy>> = {
    'bad-gateway': { label: '502 Bad Gateway', heading: '502 Bad Gateway', footer: 'nginx', isServerStyle: true },
    'service-unavailable': {
      label: '503 Unavailable',
      heading: '503 Service Temporarily Unavailable',
      footer: 'nginx',
      isServerStyle: true,
    },
    'gateway-timeout': { label: '504 Timeout', heading: '504 Gateway Time-out', footer: 'nginx', isServerStyle: true },
    maintenance: {
      label: 'Maintenance',
      heading: 'We’ll be right back',
      body: 'This page is down for scheduled maintenance. Please try again in a little while.',
      isServerStyle: false,
    },
  }

  static readonly IDS = Object.keys(HoldPages.ALL) as HoldPageId[]

  static get(id: HoldPageId): HoldPageCopy {
    return HoldPages.ALL[id]
  }

  /** Whether the hold is in force at `now` (a passed `releaseAt` lifts it). */
  static isActive(hold: LinkHold | null | undefined, now = new Date()): hold is LinkHold {
    if (!hold) return false
    if (!hold.releaseAt) return true
    const releaseAt = Date.parse(hold.releaseAt)
    return Number.isNaN(releaseAt) || releaseAt > now.getTime()
  }
}
