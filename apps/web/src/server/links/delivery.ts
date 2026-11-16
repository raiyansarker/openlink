import { LinkHold, LinkTargeting, SocialPreview } from '@openlink/contracts'
import { type } from 'arktype'

/** The delivery settings stored in `link.delivery_json`. */
export const LinkDeliverySettings = type({
  'hold?': LinkHold,
  'targeting?': LinkTargeting,
  'cloaked?': 'boolean',
  'socialPreview?': SocialPreview,
})
export type LinkDeliverySettings = typeof LinkDeliverySettings.infer

/** A change to delivery settings: `undefined` keeps a field, `null` clears it. */
export type LinkDeliveryPatch = {
  hold?: LinkHold | null
  targeting?: LinkTargeting | null
  cloaked?: boolean
  socialPreview?: SocialPreview | null
}

/** Reads and writes a link's delivery settings, dropping anything that no longer validates. */
export class LinkDelivery {
  private constructor(readonly settings: LinkDeliverySettings) {}

  static readonly EMPTY = new LinkDelivery({})

  /** Parse the stored column. Bad or outdated JSON reads as no settings rather than failing a redirect. */
  static fromJson(json: string | null | undefined): LinkDelivery {
    if (!json) return LinkDelivery.EMPTY
    let raw: unknown
    try {
      raw = JSON.parse(json)
    } catch {
      return LinkDelivery.EMPTY
    }
    const parsed = LinkDeliverySettings(raw)
    return parsed instanceof type.errors ? LinkDelivery.EMPTY : new LinkDelivery(parsed)
  }

  static from(settings: LinkDeliverySettings): LinkDelivery {
    return new LinkDelivery(LinkDelivery.compact(settings))
  }

  get hold() {
    return this.settings.hold
  }
  get targeting() {
    return this.settings.targeting
  }
  get cloaked() {
    return this.settings.cloaked === true
  }
  get socialPreview() {
    return this.settings.socialPreview
  }

  apply(patch: LinkDeliveryPatch): LinkDelivery {
    const next: LinkDeliverySettings = { ...this.settings }
    for (const key of ['hold', 'targeting', 'socialPreview'] as const) {
      const value = patch[key]
      if (value === null) delete next[key]
      else if (value !== undefined) (next as Record<string, unknown>)[key] = value
    }
    if (patch.cloaked !== undefined) next.cloaked = patch.cloaked
    return LinkDelivery.from(next)
  }

  /** Column value; null when nothing is set. */
  toJson(): string | null {
    return Object.keys(this.settings).length > 0 ? JSON.stringify(this.settings) : null
  }

  /** Fields for the API response. */
  toDto(): LinkDeliverySettings {
    return { ...this.settings }
  }

  /** Drop empty values so "nothing set" has one representation. */
  private static compact(settings: LinkDeliverySettings): LinkDeliverySettings {
    const out: LinkDeliverySettings = {}
    if (settings.hold) out.hold = settings.hold
    const targeting = settings.targeting
    if (targeting && (targeting.ios || targeting.android || (targeting.geo?.length ?? 0) > 0)) out.targeting = targeting
    if (settings.cloaked) out.cloaked = true
    const preview = settings.socialPreview
    if (preview && (preview.title || preview.description || preview.imageUrl)) out.socialPreview = preview
    return out
  }
}
