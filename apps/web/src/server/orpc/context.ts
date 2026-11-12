import type { WithEffectContext } from '@orpc/effect'

import { getRequestEffectContext } from '#/server/effect/runtime'

export type ApiContext = {
  request: Request
  /** Raw Set-Cookie header values to attach to the API response (auth). */
  setCookieHeaders: string[]
} & WithEffectContext<never>

export async function createApiContext(request: Request): Promise<ApiContext> {
  return {
    request,
    setCookieHeaders: [],
    'effect/context': await getRequestEffectContext(),
  }
}

export function mergeAuthResponseCookies(
  context: ApiContext,
  authResponse: Response,
) {
  if (typeof authResponse.headers.getSetCookie === 'function') {
    context.setCookieHeaders.push(...authResponse.headers.getSetCookie())
    return
  }
  const single = authResponse.headers.get('Set-Cookie')
  if (single) context.setCookieHeaders.push(single)
}
