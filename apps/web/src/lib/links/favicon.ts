/**
 * Favicon for a URL's host via Google's public favicon service.
 * Note: this sends the destination's hostname (not the full URL) to Google.
 */
export function faviconUrl(url: string, size = 32): string | null {
  try {
    const { hostname } = new URL(url)
    if (!hostname) return null
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=${size}`
  } catch {
    return null
  }
}
