/**
 * A picture for people who haven't uploaded one: a two-tone gradient chosen
 * from their id (so it never changes for them) with their initials in white.
 * Returned as an SVG data URI, so it works anywhere an image URL does.
 */
export class DefaultAvatar {
  /** Gradient pairs that keep white initials readable in light and dark mode. */
  private static readonly PALETTES: readonly (readonly [string, string])[] = [
    ['#6366f1', '#a855f7'],
    ['#0ea5e9', '#6366f1'],
    ['#14b8a6', '#0ea5e9'],
    ['#22c55e', '#14b8a6'],
    ['#f59e0b', '#ef4444'],
    ['#ec4899', '#f97316'],
    ['#8b5cf6', '#ec4899'],
    ['#64748b', '#334155'],
  ]

  static initials(name: string): string {
    const words = name.trim().split(/[\s@._-]+/).filter(Boolean)
    const letters = words.length > 1 ? `${words[0]![0]}${words[1]![0]}` : (words[0] ?? '?').slice(0, 2)
    return letters.toUpperCase()
  }

  /** Same seed, same palette (FNV-1a hash). */
  static palette(seed: string): readonly [string, string] {
    let hash = 0x811c9dc5
    for (let i = 0; i < seed.length; i++) {
      hash ^= seed.charCodeAt(i)
      hash = Math.imul(hash, 0x01000193)
    }
    return DefaultAvatar.PALETTES[(hash >>> 0) % DefaultAvatar.PALETTES.length]!
  }

  static dataUri(seed: string, name: string): string {
    const [from, to] = DefaultAvatar.palette(seed)
    const text = DefaultAvatar.initials(name).replace(/[<>&"']/g, '')
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>` +
      `<rect width="64" height="64" fill="url(#g)"/>` +
      `<text x="32" y="32" dy=".35em" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" font-size="24" font-weight="600" fill="#fff">${text}</text>` +
      `</svg>`
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  }
}
