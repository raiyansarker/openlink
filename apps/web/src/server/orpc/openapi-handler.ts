import { OpenAPIHandler } from '@orpc/openapi/fetch'
import { mergeStandardHeaders } from '@standard-server/core'
import { Effect } from 'effect'
import { operation } from '#/server/effect/operations'
import { createApiContext, type ApiContext } from './context'
import { router } from './router'

function withSetCookieHeaders(
  headers: Parameters<typeof mergeStandardHeaders>[0],
  setCookieHeaders: string[],
) {
  if (setCookieHeaders.length === 0) return headers

  const cookieHeader: string | string[] = setCookieHeaders
  return mergeStandardHeaders(headers, { 'set-cookie': cookieHeader })
}

export const openApiHandler = new OpenAPIHandler<ApiContext>(router, {
  // oRPC requires a Promise here; the logic itself is an Effect.
  routingInterceptors: [
    (interceptorOptions) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const result = yield* operation('openapi.route', () =>
            interceptorOptions.next(interceptorOptions),
          )
          if (!result.matched || !result.response) return result

          const { context } = interceptorOptions
          if (context.setCookieHeaders.length === 0) return result

          return {
            matched: true as const,
            response: {
              ...result.response,
              headers: withSetCookieHeaders(result.response.headers, context.setCookieHeaders),
            },
          }
        }),
      ),
  ],
})

/** Edge adapter: the HTTP framework consumes a Promise. */
export const handleOpenApiRequest = (request: Request) =>
  openApiHandler.handle(request, {
    prefix: '/api/v1',
    context: () => createApiContext(request),
  })
