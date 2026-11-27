import type { ShortLink } from '#/lib/api/types'
import { linkStatusLabel, linkTargetUrl } from './link-summary'

/**
 * CSV export for links. Pure string building so it is fully testable; the
 * browser download lives with the component that owns the button.
 */

export type ExportLinkOptions = {
  /** Full short URL for a link, e.g. `https://go.acme.com/spring-sale`. */
  shortUrlFor: (link: ShortLink) => string
}

const CSV_COLUMNS: {
  header: string
  value: (link: ShortLink, options: ExportLinkOptions) => string
}[] = [
  { header: 'name', value: (link) => link.title ?? '' },
  { header: 'short_url', value: (link, options) => options.shortUrlFor(link) },
  { header: 'destination_url', value: (link) => linkTargetUrl(link) },
  { header: 'status', value: (link) => linkStatusLabel(link) },
  { header: 'clicks', value: (link) => String(link.clickCount) },
  { header: 'tags', value: (link) => (link.tags ?? []).join(';') },
  { header: 'created_at', value: (link) => link.createdAt },
]

/**
 * Quotes a CSV field when it contains a comma, quote or line break, doubling
 * embedded quotes — RFC 4180. Everything else goes out verbatim.
 */
export function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

/** The links as RFC 4180 CSV: one header row, then one row per link. */
export function linksToCsv(
  links: readonly ShortLink[],
  options: ExportLinkOptions,
): string {
  const rows = [
    CSV_COLUMNS.map((column) => column.header),
    ...links.map((link) =>
      CSV_COLUMNS.map((column) => column.value(link, options)),
    ),
  ]
  return rows.map((row) => row.map(csvField).join(',')).join('\n')
}

/** Download name for a workspace's link export, e.g. `openlink-acme-links-2025-01-31.csv`. */
export function exportFileName(orgSlug: string, now = new Date()): string {
  return `openlink-${orgSlug}-links-${now.toISOString().slice(0, 10)}.csv`
}
