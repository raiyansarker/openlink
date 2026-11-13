import type {
  HoldPage,
  LinkHold,
  LinkTargeting,
  RedirectStatusCode,
  ShortLink,
  SocialPreview,
  UtmParameters,
} from '#/data/demo/types'

/** Same rule as the API contract (`CreateLinkRequest.slug`). */
export const SLUG_PATTERN = /^[A-Za-z0-9_-]+$/
export const MAX_SLUG_LENGTH = 64
export const MIN_PASSWORD_LENGTH = 4
export const DEFAULT_REDIRECT_STATUS: RedirectStatusCode = 302

const SLUG_ALPHABET =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/** Random slug like the server's `generateSlug` (crypto-backed, unbiased enough for 62 chars). */
export function generateSlug(length = 8): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let out = ''
  for (const byte of bytes) out += SLUG_ALPHABET[byte % SLUG_ALPHABET.length]
  return out
}

/** Adds https:// when the scheme is missing. */
export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return trimmed
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

/** True for absolute http(s) URLs with a host (mirrors the API's HttpUrl). */
export function isHttpUrl(value: string): boolean {
  // Browsers differ on odd hosts (Chrome percent-encodes spaces instead of
  // rejecting them), so check the shape ourselves as well as with URL.
  if (/\s/.test(value)) return false
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
    const host = url.hostname
    return (
      host === 'localhost' ||
      /^\[[0-9a-f:.]+\]$/i.test(host) || // IPv6
      /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) || // IPv4
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/i.test(host)
    )
  } catch {
    return false
  }
}

export const UTM_KEYS = ['source', 'medium', 'campaign', 'term', 'content'] as const
export type UtmKey = (typeof UTM_KEYS)[number]

/** Drops empty values; returns undefined when nothing is set. */
export function cleanUtm(utm: UtmParameters): UtmParameters | undefined {
  const out: UtmParameters = {}
  for (const key of UTM_KEYS) {
    const value = utm[key]?.trim()
    if (value) out[key] = value
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/** Reads utm_* params already present in a destination URL. */
export function readUtmFromUrl(value: string): UtmParameters {
  try {
    const url = new URL(normalizeUrl(value))
    const out: UtmParameters = {}
    for (const key of UTM_KEYS) {
      const found = url.searchParams.get(`utm_${key}`)
      if (found) out[key] = found
    }
    return out
  } catch {
    return {}
  }
}

/** Destination with UTM parameters applied (UTM values win over existing ones). */
export function applyUtm(destination: string, utm: UtmParameters | undefined): string {
  if (!utm) return destination
  try {
    const url = new URL(destination)
    for (const key of UTM_KEYS) {
      const value = utm[key]
      if (value) url.searchParams.set(`utm_${key}`, value)
    }
    return url.toString()
  } catch {
    return destination
  }
}

export type MetadataRow = { id: string; key: string; value: string }
export type GeoRuleRow = { id: string; country: string; url: string }

export type CreateLinkDraft = {
  destination: string
  title: string
  description: string
  domainId: string | null
  slug: string
  folderId: string | null
  tags: string[]
  utmEnabled: boolean
  utm: UtmParameters
  redirectStatus: RedirectStatusCode
  scheduleEnabled: boolean
  /** Local "YYYY-MM-DDTHH:mm" from DateTimeInput. */
  activateAt: string | undefined
  expiryEnabled: boolean
  expiresAt: string | undefined
  clickLimitEnabled: boolean
  maxClicks: number | null
  expiredDestination: string
  passwordEnabled: boolean
  password: string
  fallbackDestination: string
  metadata: MetadataRow[]
  cloakEnabled: boolean
  previewEnabled: boolean
  previewTitle: string
  previewDescription: string
  previewImage: string
  targetingEnabled: boolean
  iosUrl: string
  androidUrl: string
  geoRules: GeoRuleRow[]
  holdEnabled: boolean
  holdPage: HoldPage
  holdReleaseEnabled: boolean
  holdReleaseAt: string | undefined
}

export const MAX_PREVIEW_IMAGE_BYTES = 5 * 1024 * 1024
export const PREVIEW_IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'

export const MAX_PREVIEW_TITLE = 70
export const MAX_PREVIEW_DESCRIPTION = 200

export function emptyDraft(folderId: string | null): CreateLinkDraft {
  return {
    destination: '',
    title: '',
    description: '',
    domainId: null,
    slug: '',
    folderId,
    tags: [],
    utmEnabled: false,
    utm: {},
    redirectStatus: DEFAULT_REDIRECT_STATUS,
    scheduleEnabled: false,
    activateAt: undefined,
    expiryEnabled: false,
    expiresAt: undefined,
    clickLimitEnabled: false,
    maxClicks: null,
    expiredDestination: '',
    passwordEnabled: false,
    password: '',
    fallbackDestination: '',
    metadata: [],
    cloakEnabled: false,
    previewEnabled: false,
    previewTitle: '',
    previewDescription: '',
    previewImage: '',
    targetingEnabled: false,
    iosUrl: '',
    androidUrl: '',
    geoRules: [],
    holdEnabled: false,
    holdPage: 'bad-gateway',
    holdReleaseEnabled: false,
    holdReleaseAt: undefined,
  }
}

export type DraftField =
  | 'destination'
  | 'slug'
  | 'activateAt'
  | 'expiresAt'
  | 'maxClicks'
  | 'expiredDestination'
  | 'password'
  | 'fallbackDestination'
  | 'metadata'
  | 'previewTitle'
  | 'previewDescription'
  | 'previewImage'
  | 'iosUrl'
  | 'androidUrl'
  | 'geoRules'
  | 'holdReleaseAt'

export type DraftErrors = Partial<Record<DraftField, string>>

export type ValidationContext = {
  /** Existing links in the org, used for per-domain slug uniqueness. */
  links: ShortLink[]
  now?: Date
  /**
   * Editing an existing link: its back-half/domain are fixed (skip the
   * uniqueness check) and an empty password keeps the current one.
   */
  editing?: { linkId: string; hasPassword: boolean }
}

export function isSlugTaken(
  links: ShortLink[],
  domainId: string | null,
  slug: string,
): boolean {
  const wanted = slug.trim().toLowerCase()
  return links.some(
    (l) => (l.domainId ?? null) === domainId && l.slug.toLowerCase() === wanted,
  )
}

function parseLocal(value: string | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Field-level validation; an empty object means the draft can be saved. */
export function validateDraft(
  draft: CreateLinkDraft,
  { links, now = new Date(), editing }: ValidationContext,
): DraftErrors {
  const errors: DraftErrors = {}

  const destination = normalizeUrl(draft.destination)
  if (!destination) errors.destination = 'Paste the URL this link should open.'
  else if (!isHttpUrl(destination)) errors.destination = 'Enter a valid http(s) URL.'

  const slug = draft.slug.trim()
  if (slug && !editing) {
    if (!SLUG_PATTERN.test(slug)) {
      errors.slug = 'Use letters, numbers, “-” or “_” only.'
    } else if (slug.length > MAX_SLUG_LENGTH) {
      errors.slug = `Use ${MAX_SLUG_LENGTH} characters or fewer.`
    } else if (isSlugTaken(links, draft.domainId, slug)) {
      errors.slug = 'This back-half is already used on this domain.'
    }
  }

  const activateAt = draft.scheduleEnabled ? parseLocal(draft.activateAt) : null
  if (draft.scheduleEnabled && !activateAt) {
    errors.activateAt = 'Pick when the link should start working.'
  }

  const expiresAt = draft.expiryEnabled ? parseLocal(draft.expiresAt) : null
  if (draft.expiryEnabled) {
    if (!expiresAt) errors.expiresAt = 'Pick when the link should stop working.'
    else if (expiresAt <= now) errors.expiresAt = 'Choose a time in the future.'
    else if (activateAt && expiresAt <= activateAt) {
      errors.expiresAt = 'Expiry must be after the activation time.'
    }
  }

  if (draft.clickLimitEnabled) {
    if (
      draft.maxClicks == null ||
      !Number.isInteger(draft.maxClicks) ||
      draft.maxClicks < 1
    ) {
      errors.maxClicks = 'Enter a whole number of 1 or more.'
    }
  }

  const expired = draft.expiredDestination.trim()
  if ((draft.expiryEnabled || draft.clickLimitEnabled) && expired) {
    if (!isHttpUrl(normalizeUrl(expired))) {
      errors.expiredDestination = 'Enter a valid http(s) URL.'
    }
  }

  const keepsPassword = editing?.hasPassword && draft.password.length === 0
  if (
    draft.passwordEnabled &&
    !keepsPassword &&
    draft.password.length < MIN_PASSWORD_LENGTH
  ) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  }

  const fallback = draft.fallbackDestination.trim()
  if (fallback && !isHttpUrl(normalizeUrl(fallback))) {
    errors.fallbackDestination = 'Enter a valid http(s) URL.'
  }

  const keys = draft.metadata.map((row) => row.key.trim()).filter(Boolean)
  if (draft.metadata.some((row) => !row.key.trim() && row.value.trim())) {
    errors.metadata = 'Every value needs a key.'
  } else if (new Set(keys.map((k) => k.toLowerCase())).size !== keys.length) {
    errors.metadata = 'Metadata keys must be unique.'
  }

  if (draft.previewEnabled) {
    const title = draft.previewTitle.trim()
    const description = draft.previewDescription.trim()
    const image = draft.previewImage.trim()
    if (title.length > MAX_PREVIEW_TITLE) {
      errors.previewTitle = `Use ${MAX_PREVIEW_TITLE} characters or fewer.`
    }
    if (description.length > MAX_PREVIEW_DESCRIPTION) {
      errors.previewDescription = `Use ${MAX_PREVIEW_DESCRIPTION} characters or fewer.`
    }
    // Uploaded images are stored as data: URLs; http(s) URLs are accepted too.
    if (image && !image.startsWith('data:image/') && !isHttpUrl(image)) {
      errors.previewImage = 'Upload a PNG, JPG, WebP or GIF image.'
    }
  }

  if (draft.targetingEnabled) {
    const ios = draft.iosUrl.trim()
    const android = draft.androidUrl.trim()
    if (ios && !isHttpUrl(normalizeUrl(ios))) {
      errors.iosUrl = 'Enter a valid http(s) URL.'
    }
    if (android && !isHttpUrl(normalizeUrl(android))) {
      errors.androidUrl = 'Enter a valid http(s) URL.'
    }
    const rows = draft.geoRules.filter((r) => r.country || r.url.trim())
    const countries = rows.map((r) => r.country).filter(Boolean)
    if (rows.some((r) => !r.country || !r.url.trim())) {
      errors.geoRules = 'Each country rule needs a country and a URL.'
    } else if (rows.some((r) => !isHttpUrl(normalizeUrl(r.url)))) {
      errors.geoRules = 'Enter a valid http(s) URL for every country.'
    } else if (new Set(countries).size !== countries.length) {
      errors.geoRules = 'Each country can only have one rule.'
    } else if (!ios && !android && rows.length === 0) {
      errors.geoRules = 'Add an iOS, Android or country destination.'
    }
  }

  if (draft.holdEnabled && draft.holdReleaseEnabled) {
    const releaseAt = parseLocal(draft.holdReleaseAt)
    if (!releaseAt) errors.holdReleaseAt = 'Pick when the hold should lift.'
    else if (releaseAt <= now) errors.holdReleaseAt = 'Choose a time in the future.'
  }

  return errors
}

/** Hold settings, or undefined when Hold mode is off. */
export function cleanHold(draft: CreateLinkDraft): LinkHold | undefined {
  if (!draft.holdEnabled) return undefined
  const releaseAt = draft.holdReleaseEnabled
    ? parseLocal(draft.holdReleaseAt)
    : null
  return {
    page: draft.holdPage,
    ...(releaseAt ? { releaseAt: releaseAt.toISOString() } : {}),
  }
}

/** True while a link's hold is in effect (it lifts itself at `releaseAt`). */
export function isOnHold(link: Pick<ShortLink, 'hold'>, now = new Date()): boolean {
  if (!link.hold) return false
  return !link.hold.releaseAt || new Date(link.hold.releaseAt) > now
}

/** Targeting rules, or undefined when targeting is off or empty. */
export function cleanTargeting(
  draft: CreateLinkDraft,
): LinkTargeting | undefined {
  if (!draft.targetingEnabled) return undefined
  const out: LinkTargeting = {}
  const ios = draft.iosUrl.trim()
  const android = draft.androidUrl.trim()
  if (ios) out.ios = normalizeUrl(ios)
  if (android) out.android = normalizeUrl(android)
  const geo = draft.geoRules
    .filter((r) => r.country && r.url.trim())
    .map((r) => ({ country: r.country, url: normalizeUrl(r.url) }))
  if (geo.length > 0) out.geo = geo
  return Object.keys(out).length > 0 ? out : undefined
}

/** Social card fields, or undefined when the preview is off or empty. */
export function cleanSocialPreview(
  draft: CreateLinkDraft,
): SocialPreview | undefined {
  if (!draft.previewEnabled) return undefined
  const out: SocialPreview = {}
  const title = draft.previewTitle.trim()
  const description = draft.previewDescription.trim()
  const image = draft.previewImage.trim()
  if (title) out.title = title
  if (description) out.description = description
  if (image) out.imageUrl = image
  return Object.keys(out).length > 0 ? out : undefined
}

/** Status the link starts in, matching the server's create rule. */
export function initialStatus(
  draft: CreateLinkDraft,
  now = new Date(),
): ShortLink['status'] {
  const activateAt = draft.scheduleEnabled ? parseLocal(draft.activateAt) : null
  return activateAt && activateAt > now ? 'scheduled' : 'active'
}

/** Builds the stored link from a validated draft. */
export function draftToLink(
  draft: CreateLinkDraft,
  { orgId, id, slug, now = new Date() }: {
    orgId: string
    id: string
    /** Final slug (generated when the draft left it blank). */
    slug: string
    now?: Date
  },
): ShortLink {
  const destination = normalizeUrl(draft.destination)
  const utm = draft.utmEnabled ? cleanUtm(draft.utm) : undefined
  const activateAt = draft.scheduleEnabled ? parseLocal(draft.activateAt) : null
  const expiresAt = draft.expiryEnabled ? parseLocal(draft.expiresAt) : null
  const hasExpiryRule = draft.expiryEnabled || draft.clickLimitEnabled
  const expired = draft.expiredDestination.trim()
  const fallback = draft.fallbackDestination.trim()
  const metadata = Object.fromEntries(
    draft.metadata
      .filter((row) => row.key.trim())
      .map((row) => [row.key.trim(), row.value.trim()]),
  )

  let host = ''
  try {
    host = new URL(destination).hostname.replace(/^www\./, '')
  } catch {
    /* validated already */
  }

  return {
    id,
    orgId,
    slug,
    title: draft.title.trim() || host || slug,
    description: draft.description.trim() || undefined,
    targetUrl: applyUtm(destination, utm),
    destinationUrl: destination,
    clicks: 0,
    uniqueClicks: 0,
    createdAt: now.toISOString(),
    status: initialStatus(draft, now),
    tags: [...new Set(draft.tags.map((t) => t.trim()).filter(Boolean))],
    folderId: draft.folderId,
    domainId: draft.domainId,
    redirectStatus: draft.redirectStatus,
    activateAt: activateAt?.toISOString(),
    expiresAt: expiresAt?.toISOString(),
    maxClicks: draft.clickLimitEnabled ? (draft.maxClicks ?? undefined) : undefined,
    passwordProtected: draft.passwordEnabled || undefined,
    expiredDestinationUrl:
      hasExpiryRule && expired ? normalizeUrl(expired) : undefined,
    fallbackDestinationUrl: fallback ? normalizeUrl(fallback) : undefined,
    utm,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    cloaked: draft.cloakEnabled || undefined,
    socialPreview: cleanSocialPreview(draft),
    targeting: cleanTargeting(draft),
    hold: cleanHold(draft),
  }
}

/** "YYYY-MM-DDTHH:mm" local value for DateTimeInput from an ISO timestamp. */
export function isoToLocalInput(iso: string | undefined): string | undefined {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Strips utm_* params that `applyUtm` added, recovering the entered URL. */
function stripUtm(url: string, utm: UtmParameters | undefined): string {
  if (!utm) return url
  try {
    const parsed = new URL(url)
    for (const key of UTM_KEYS) {
      if (utm[key] && parsed.searchParams.get(`utm_${key}`) === utm[key]) {
        parsed.searchParams.delete(`utm_${key}`)
      }
    }
    return parsed.toString()
  } catch {
    return url
  }
}

/** Fills the form from an existing link (inverse of `draftToLink`). */
export function linkToDraft(link: ShortLink): CreateLinkDraft {
  const base = emptyDraft(link.folderId ?? null)
  let n = 0
  const id = (prefix: string) => `${prefix}_${link.id}_${n++}`
  return {
    ...base,
    destination: link.destinationUrl ?? stripUtm(link.targetUrl, link.utm),
    title: link.title,
    description: link.description ?? '',
    domainId: link.domainId ?? null,
    slug: link.slug,
    tags: [...link.tags],
    utmEnabled: !!link.utm,
    utm: { ...link.utm },
    redirectStatus: link.redirectStatus ?? DEFAULT_REDIRECT_STATUS,
    scheduleEnabled: !!link.activateAt,
    activateAt: isoToLocalInput(link.activateAt),
    expiryEnabled: !!link.expiresAt,
    expiresAt: isoToLocalInput(link.expiresAt),
    clickLimitEnabled: link.maxClicks != null,
    maxClicks: link.maxClicks ?? null,
    expiredDestination: link.expiredDestinationUrl ?? '',
    passwordEnabled: !!link.passwordProtected,
    password: '',
    fallbackDestination: link.fallbackDestinationUrl ?? '',
    metadata: Object.entries(link.metadata ?? {}).map(([key, value]) => ({
      id: id('meta'),
      key,
      value,
    })),
    cloakEnabled: !!link.cloaked,
    previewEnabled: !!link.socialPreview,
    previewTitle: link.socialPreview?.title ?? '',
    previewDescription: link.socialPreview?.description ?? '',
    previewImage: link.socialPreview?.imageUrl ?? '',
    targetingEnabled: !!link.targeting,
    iosUrl: link.targeting?.ios ?? '',
    androidUrl: link.targeting?.android ?? '',
    geoRules: (link.targeting?.geo ?? []).map((rule) => ({
      id: id('geo'),
      country: rule.country,
      url: rule.url,
    })),
    holdEnabled: !!link.hold,
    holdPage: link.hold?.page ?? base.holdPage,
    holdReleaseEnabled: !!link.hold?.releaseAt,
    holdReleaseAt: isoToLocalInput(link.hold?.releaseAt),
  }
}
