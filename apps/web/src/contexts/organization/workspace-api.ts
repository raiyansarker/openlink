import type { ShortLink } from '#/lib/api/types'
import { apiErrorMessage } from '#/lib/api/errors'
import { api } from '#/lib/api/orpc'

/** Bulk endpoints take at most this many ids per call. */
const BULK_LIMIT = 200
export const chunks = <T,>(items: T[]) =>
  Array.from({ length: Math.ceil(items.length / BULK_LIMIT) }, (_, i) => items.slice(i * BULK_LIMIT, (i + 1) * BULK_LIMIT))

/** Page size for loading a workspace's links. */
const LINKS_PAGE = 200
/** Safety cap for one workspace list; the browser filters and searches locally. */
export const MAX_LINKS = 2000

/** Every link of a workspace, page by page up to `MAX_LINKS`. */
export async function listAllLinks(organizationId: string): Promise<ShortLink[]> {
  const links: ShortLink[] = []
  for (let offset = 0; offset < MAX_LINKS; offset += LINKS_PAGE) {
    const page = await api.links.listOrganizationLinks({
      params: { organizationId },
      query: { limit: String(LINKS_PAGE), offset: String(offset) },
    })
    links.push(...page.items)
    if (links.length >= page.total || page.items.length === 0) break
  }
  return links
}

/** List responses carry their rows in `items`. Module-level so `select` stays stable. */
export const selectItems = <T,>(data: { items: T[] }): T[] => data.items

/** Turns any failure into an Error whose message is safe to show. */
export async function friendly<T>(run: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await run()
  } catch (error) {
    throw new Error(apiErrorMessage(error, fallback))
  }
}
