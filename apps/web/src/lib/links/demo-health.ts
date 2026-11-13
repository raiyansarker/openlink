import type { LinkHealth, ShortLink } from '#/data/demo/types'

/** Above this, a reachable destination counts as slow. */
export const SLOW_RESPONSE_MS = 2000

/** Small deterministic hash so the same destination gets the same result. */
function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Demo stand-in for the backend health check. The real check runs on the
 * server (browsers can't fetch arbitrary sites cross-origin); this produces
 * a plausible, stable result per destination so the UI states can be seen.
 */
export function demoCheckHealth(link: ShortLink, now = new Date()): LinkHealth {
  const url = link.destinationUrl ?? link.targetUrl
  const h = hash(url)
  const bucket = h % 10
  const checkedAt = now.toISOString()
  if (/(^|\.)example\.(com|org|net)$/.test(safeHost(url)) || bucket === 0) {
    return { status: 'broken', statusCode: 404, responseMs: 180 + (h % 200), checkedAt }
  }
  if (bucket === 1) {
    return { status: 'slow', statusCode: 200, responseMs: SLOW_RESPONSE_MS + (h % 2500), checkedAt }
  }
  if (bucket === 2) {
    const final = new URL(url)
    final.pathname = '/'
    return { status: 'redirects', statusCode: 301, responseMs: 240 + (h % 300), checkedAt, finalUrl: final.toString() }
  }
  return { status: 'healthy', statusCode: 200, responseMs: 90 + (h % 400), checkedAt }
}

function safeHost(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

export const HEALTH_LABEL: Record<LinkHealth['status'], string> = {
  healthy: 'Healthy',
  redirects: 'Redirects elsewhere',
  slow: 'Slow',
  broken: 'Broken',
}

export function healthNeedsAttention(health: LinkHealth | undefined): boolean {
  return health?.status === 'broken'
}
