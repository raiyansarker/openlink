import { createHash, randomBytes } from 'node:crypto'

export const API_KEY_PREFIX = 'ol_live_'
const DISPLAY_PREFIX_LENGTH = API_KEY_PREFIX.length + 4

export const hashApiKey = (secret: string) => createHash('sha256').update(secret).digest('hex')

/** The secret is returned to the caller once; only `hash` is persisted. */
export function generateApiKey() {
  const secret = `${API_KEY_PREFIX}${randomBytes(24).toString('base64url')}`
  return { secret, prefix: secret.slice(0, DISPLAY_PREFIX_LENGTH), hash: hashApiKey(secret) }
}

/** Extract an OpenLink API key from an `Authorization: Bearer …` header. */
export function readBearerApiKey(header: string | null): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(header?.trim() ?? '')
  const token = match?.[1]
  return token && token.startsWith(API_KEY_PREFIX) ? token : null
}
