import type { WithEffectContext } from '@orpc/effect'
import { Context, Effect } from 'effect'

import type { AppServices } from '#/server/effect/layer'
import { requestEffectContext } from '#/server/effect/runtime'
import { WorkerRequest } from '#/server/effect/services/request'
import { wrapApiEffect } from '#/server/effect/wrap'

export type ApiContext = {
  request: Request
  /** Raw Set-Cookie header values to attach to the API response (auth). */
  setCookieHeaders: string[]
} & WithEffectContext<AppServices | WorkerRequest>

/** oRPC needs a Promise at the HTTP edge; the context itself is built as an Effect. */
export const createApiContext = (request: Request): Promise<ApiContext> =>
  Effect.runPromise(
    requestEffectContext.pipe(
      Effect.map((base) => ({
        request,
        setCookieHeaders: [],
        'effect/context': base.pipe(Context.add(WorkerRequest, request)) as ApiContext['effect/context'],
        'effect/wrap': wrapApiEffect,
      })),
    ),
  )

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
