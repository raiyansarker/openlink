import type { LinkFolder, ShortLink } from '#/lib/api/types'
import { countryName } from '#/lib/links/countries'
import { applyUtm, isOnHold } from '#/lib/links/create-link'
import { folderPathLabel } from '#/lib/links/folder-tree'
import { holdPageMeta } from '#/lib/links/hold-pages'
import { linkStatusMeta } from '#/lib/links/status-meta'

export type SummaryRow = { label: string; value: string }

const dateTime = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : dateTime.format(date)
}

export function hostOf(url: string | undefined): string {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** The link's title, or its back-half when it has none. */
export function linkTitle(link: Pick<ShortLink, 'title' | 'slug'>): string {
  return link.title || link.slug
}

/** Where the link sends people: the destination with its UTM parameters applied. */
export function linkTargetUrl(link: Pick<ShortLink, 'destinationUrl' | 'utm'>): string {
  return applyUtm(link.destinationUrl, link.utm)
}

/**
 * A link's status as of `now`, not as of when the list was fetched: schedules
 * start, expiry dates pass and click limits run out while the page is open.
 */
export class LinkLiveStatus {
  static isExpired(link: ShortLink, now = new Date()): boolean {
    if (link.expiresAt && new Date(link.expiresAt) <= now) return true
    return link.maxClicks != null && link.clickCount >= link.maxClicks
  }

  /** Scheduled and its start time is still ahead. */
  static isWaiting(link: ShortLink, now = new Date()): boolean {
    return link.status === 'scheduled' && (!link.activateAt || new Date(link.activateAt) > now)
  }

  static current(link: ShortLink, now = new Date()): ShortLink['status'] {
    if (link.status === 'scheduled' && !LinkLiveStatus.isWaiting(link, now)) return 'active'
    return link.status
  }
}

/** One-line status for a saved link (hold wins over the stored status). */
export function linkStatusLine(link: ShortLink, now = new Date()): string {
  if (isOnHold(link, now)) {
    const page = holdPageMeta(link.hold!.page)
    return link.hold!.releaseAt
      ? `On hold — showing “${page.heading}” until ${formatDateTime(link.hold!.releaseAt)}`
      : `On hold — showing “${page.heading}” until you release it`
  }
  if (LinkLiveStatus.isExpired(link, now)) return 'Expired'
  if (LinkLiveStatus.isWaiting(link, now)) {
    return `Scheduled — starts redirecting ${formatDateTime(link.activateAt)}`
  }
  return linkStatusMeta(LinkLiveStatus.current(link, now)).description
}

export function linkStatusLabel(link: ShortLink, now = new Date()): string {
  if (isOnHold(link, now)) return 'On hold'
  if (LinkLiveStatus.isExpired(link, now)) return 'Expired'
  return linkStatusMeta(LinkLiveStatus.current(link, now)).label
}

/** Everything configured on a link, as label/value rows. */
export function linkSettingsRows(
  link: ShortLink,
  folders: LinkFolder[],
): SummaryRow[] {
  const rows: SummaryRow[] = [
    { label: 'Folder', value: folderPathLabel(folders, link.folderId ?? null) },
    link.cloaked
      ? { label: 'Delivery', value: 'Cloaked — URL stays short' }
      : { label: 'Delivery', value: '302 temporary redirect' },
  ]
  if (link.hold) {
    rows.push({
      label: 'Hold mode',
      value:
        holdPageMeta(link.hold.page).label +
        (link.hold.releaseAt ? ` until ${formatDateTime(link.hold.releaseAt)}` : ''),
    })
  }
  if (link.targeting) {
    const parts: string[] = []
    if (link.targeting.ios) parts.push('iOS')
    if (link.targeting.android) parts.push('Android')
    for (const rule of link.targeting.geo ?? []) parts.push(countryName(rule.country))
    rows.push({ label: 'Targeting', value: parts.join(', ') })
  }
  if (link.activateAt) rows.push({ label: 'Starts', value: formatDateTime(link.activateAt) })
  if (link.expiresAt) rows.push({ label: 'Expires', value: formatDateTime(link.expiresAt) })
  if (link.maxClicks) rows.push({ label: 'Click limit', value: `${link.maxClicks.toLocaleString()} clicks` })
  if (link.expiredDestinationUrl) rows.push({ label: 'After expiry', value: hostOf(link.expiredDestinationUrl) })
  if (link.passwordProtected) rows.push({ label: 'Password', value: 'Required to open' })
  if (link.fallbackDestinationUrl) rows.push({ label: 'Fallback', value: hostOf(link.fallbackDestinationUrl) })
  if (link.utm) {
    rows.push({
      label: 'UTM',
      value: Object.entries(link.utm)
        .map(([k, v]) => `${k}=${v}`)
        .join(', '),
    })
  }
  if (link.socialPreview) rows.push({ label: 'Social preview', value: 'Custom' })
  if (link.metadata) {
    for (const [key, value] of Object.entries(link.metadata)) {
      rows.push({ label: key, value: String(value) })
    }
  }
  return rows
}
