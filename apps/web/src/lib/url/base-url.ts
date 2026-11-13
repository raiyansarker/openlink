export type BaseUrlOptions = {
  /**
   * When true, prefer returning a relative base ("") on the server.
   * This is safer for SSR/hydration when you don't strictly need an absolute URL.
   */
  allowRelative?: boolean
}

/**
 * Returns the current runtime origin (scheme + host + port) when on the client.
 *
 * On the server, falls back to "" (relative) unless a public base URL is configured.
 *
 * If you need absolute URLs during SSR (e.g. generating share links), set
 * `VITE_PUBLIC_BASE_URL` (or `PUBLIC_BASE_URL`) to something like "https://app.openlink.xyz".
 */
export function getBaseUrl(options: BaseUrlOptions = {}): string {
  const allowRelative = options.allowRelative ?? true

  // Client-side: always accurate.
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }

  // Server-side: use an explicit public base URL if provided.
  // Vite exposes only VITE_* to the client; on the server we can read either.
  const fromEnv =
    (typeof process !== 'undefined' &&
      (process.env.VITE_PUBLIC_BASE_URL || process.env.PUBLIC_BASE_URL)) ||
    ''

  if (fromEnv) return fromEnv.replace(/\/$/, '')
  return allowRelative ? '' : 'http://localhost'
}

/** Build an absolute URL (or relative if base is ""). */
export function buildUrl(pathname: string, base: string = getBaseUrl()): string {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  if (!base) return path
  return `${base}${path}`
}
