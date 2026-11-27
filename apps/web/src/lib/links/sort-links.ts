import type { ShortLink } from '#/lib/api/types'
import { linkStatusLabel, linkTargetUrl } from './link-summary'

/**
 * Client-side sorting for the links table. Pure so it is fully testable;
 * the table plugin (`useTableSortable`) only reports the requested order.
 */

export type LinkSortKey =
  | 'title'
  | 'shortUrl'
  | 'targetUrl'
  | 'clickCount'
  | 'status'
  | 'createdAt'

export type LinkSortDirection = 'ascending' | 'descending'

export type LinkSort = { sortKey: LinkSortKey; direction: LinkSortDirection }

const accessors: Record<LinkSortKey, (link: ShortLink) => string | number> = {
  title: (link) => (link.title ?? '').toLowerCase(),
  shortUrl: (link) => link.slug.toLowerCase(),
  targetUrl: (link) => linkTargetUrl(link).toLowerCase(),
  clickCount: (link) => link.clickCount,
  status: (link) => linkStatusLabel(link).toLowerCase(),
  createdAt: (link) => new Date(link.createdAt).getTime(),
}

/**
 * Sorts a copy of `links` by the primary sort entry (the table sorts on one
 * column at a time). Ties and missing accessors keep the original order, so
 * with an empty `sort` the caller's order — e.g. newest first — survives.
 */
export function sortLinks<T extends ShortLink>(
  links: readonly T[],
  sort: readonly LinkSort[],
): T[] {
  const primary = sort[0]
  if (!primary) return [...links]
  const accessor = accessors[primary.sortKey]
  if (!accessor) return [...links]
  const factor = primary.direction === 'descending' ? -1 : 1
  return [...links].sort((a, b) => {
    const aKey = accessor(a)
    const bKey = accessor(b)
    if (aKey < bKey) return -factor
    if (aKey > bKey) return factor
    return 0
  })
}
