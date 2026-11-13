import { getBaseUrl } from './base-url'

/**
 * Human-friendly host label for UI examples.
 * Falls back to "your-domain.com" during SSR/build when no origin is known.
 */
export function currentHostLabel(fallback: string = 'your-domain.com'): string {
  const base = getBaseUrl({ allowRelative: true })
  if (!base) return fallback

  try {
    return new URL(base).host
  } catch {
    return fallback
  }
}
