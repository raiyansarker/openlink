import { API_KEY_PREFIX } from '#/server/auth/api-keys'

/** Extract an OpenLink API key from an `Authorization: Bearer …` header. */
export function readBearerApiKey(header: string | null): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(header?.trim() ?? '')
  const token = match?.[1]
  return token && token.startsWith(API_KEY_PREFIX) ? token : null
}
