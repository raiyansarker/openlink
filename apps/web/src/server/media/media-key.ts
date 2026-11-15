export type MediaKind = 'avatars' | 'logos'

/** Where uploads live in the bucket, and the URL each one is served from. */
export class MediaKey {
  static readonly URL_PREFIX = '/api/media/'

  private static readonly KINDS: readonly MediaKind[] = ['avatars', 'logos']
  private static readonly SAFE_KEY = /^(avatars|logos)\/[A-Za-z0-9_-]+\/[A-Za-z0-9-]+\.(png|jpg|gif|webp)$/

  /** A fresh, unguessable key; a new key per upload means URLs can be cached forever. */
  static create(kind: MediaKind, ownerId: string, extension: string): string {
    return `${kind}/${MediaKey.safeSegment(ownerId)}/${crypto.randomUUID()}.${extension}`
  }

  static toUrl(key: string): string {
    return `${MediaKey.URL_PREFIX}${key}`
  }

  /** The key behind one of our media URLs, or null for anything else (provider pictures, junk). */
  static fromUrl(url: string | null | undefined): string | null {
    if (!url || !url.startsWith(MediaKey.URL_PREFIX)) return null
    return MediaKey.parse(url.slice(MediaKey.URL_PREFIX.length))
  }

  /** Accepts only keys this app could have written; blocks traversal and other folders. */
  static parse(key: string): string | null {
    return MediaKey.SAFE_KEY.test(key) ? key : null
  }

  static isKind(value: string): value is MediaKind {
    return (MediaKey.KINDS as readonly string[]).includes(value)
  }

  private static safeSegment(value: string) {
    return value.replace(/[^A-Za-z0-9_-]/g, '_')
  }
}
