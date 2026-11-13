import type { WithEffectContext } from '@orpc/effect'
import { Context } from 'effect'

import { getRequestEffectContext } from '#/server/effect/runtime'
import type { AppServices } from '#/server/effect/layer'
import { WorkerRequest } from '#/server/effect/services/request'
import { wrapApiEffect } from '#/server/effect/wrap'

export type ApiContext = {
  request: Request
  /** Raw Set-Cookie header values to attach to the API response (auth). */
  setCookieHeaders: string[]
} & WithEffectContext<AppServices | WorkerRequest>

export async function createApiContext(request: Request): Promise<ApiContext> {
  const base = await getRequestEffectContext()
  return {
    request,
    setCookieHeaders: [],
    'effect/context': base.pipe(Context.add(WorkerRequest, request)) as ApiContext['effect/context'],
    'effect/wrap': wrapApiEffect,
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
