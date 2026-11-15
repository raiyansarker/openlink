import type { link } from '@openlink/db/schema'
import { deriveLinkStatus } from '#/server/links/rules'

type LinkRow = typeof link.$inferSelect

export type RedirectDecision =
  | { type: 'redirect'; url: string; status: number; countsClick: boolean }
  | { type: 'password_required' }
  | { type: 'not_found' }
  | { type: 'gone' }

const UTM_KEYS = ['source', 'medium', 'campaign', 'term', 'content'] as const

/** Append the link's UTM parameters without overriding ones already on the destination. */
export function applyUtm(destination: string, utm: Record<string, string | undefined> | null) {
  if (!utm) return destination
  let url: URL
  try {
    url = new URL(destination)
  } catch {
    return destination
  }
  for (const key of UTM_KEYS) {
    const value = utm[key]
    const param = `utm_${key}`
    if (value && !url.searchParams.has(param)) url.searchParams.set(param, value)
  }
  return url.toString()
}

function parseUtm(json: string | null): Record<string, string | undefined> | null {
  if (!json) return null
  try {
    return JSON.parse(json) as Record<string, string | undefined>
  } catch {
    return null
  }
}

/**
 * Decide what a visitor to this link should get.
 *
 * Pure so the rules are testable without a database. `passwordVerified` says
 * whether the visitor already proved knowledge of the link password.
 */
export function decideRedirect(
  row: LinkRow,
  options: { now?: Date; passwordVerified?: boolean } = {},
): RedirectDecision {
  const now = options.now ?? new Date()
  const status = deriveLinkStatus(row, now)

  if (status === 'expired') {
    const target = row.expiredDestinationUrl ?? row.fallbackDestinationUrl
    return target
      ? { type: 'redirect', url: target, status: row.redirectStatus, countsClick: false }
      : { type: 'gone' }
  }
  if (status !== 'active') {
    return row.fallbackDestinationUrl
      ? { type: 'redirect', url: row.fallbackDestinationUrl, status: row.redirectStatus, countsClick: false }
      : { type: 'not_found' }
  }
  if (row.passwordHash && !options.passwordVerified) return { type: 'password_required' }

  return {
    type: 'redirect',
    url: applyUtm(row.destinationUrl, parseUtm(row.utmJson)),
    status: row.redirectStatus,
    countsClick: true,
  }
}
