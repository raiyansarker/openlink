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

/** Statuses that must not carry a body in the Fetch API. */
const NO_CONTENT_STATUSES = new Set([204, 205, 304])

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
          const response = result.response
          // Workers reject a body on 204/205/304 ("null body status"); procedures declare `{}` for these.
          const body = NO_CONTENT_STATUSES.has(response.status) ? undefined : response.body
          if (context.setCookieHeaders.length === 0 && body === response.body) return result

          return {
            matched: true as const,
            response: {
              ...response,
              body,
              headers: withSetCookieHeaders(response.headers, context.setCookieHeaders),
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
