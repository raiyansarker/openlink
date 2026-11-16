import { OpenAPIHandler } from '@orpc/openapi/fetch'
import { COMMON_ERROR_STATUS_MAP, ORPCError, onError } from '@orpc/server'
import { mergeStandardHeaders } from '@standard-server/core'
import { Effect } from 'effect'
import { operation } from '#/server/effect/operations'
import { effectRuntime } from '#/server/effect/runtime'
import { ServerLog } from '#/server/observability'
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

/** Logs a failed procedure call: 5xx and unexpected errors with their cause chain, 4xx briefly. */
class ProcedureFailureLog {
  static record(error: unknown, path: readonly string[], request: Request) {
    const url = new URL(request.url)
    const fields = { procedure: path.join('.'), method: request.method, path: url.pathname, ray: request.headers.get('cf-ray') }
    const status = error instanceof ORPCError ? ProcedureFailureLog.statusOf(error.code) : 500
    if (error instanceof ORPCError && status < 500) {
      // Signed-out polling is routine; everything else in 4xx is worth a line.
      if (status === 401) return
      ServerLog.info('api.procedure_rejected', { ...fields, status, code: error.code, message: error.message })
      return
    }
    ServerLog.error('api.procedure_failed', error, { ...fields, status })
  }

  private static statusOf(code: string) {
    return (COMMON_ERROR_STATUS_MAP as Record<string, number>)[code] ?? 500
  }
}

export const openApiHandler = new OpenAPIHandler<ApiContext>(router, {
  clientInterceptors: [
    onError((error, { path, context }) => ProcedureFailureLog.record(error, path, context.request)),
  ],
  // oRPC requires a Promise here; the logic itself is an Effect.
  routingInterceptors: [
    (interceptorOptions) =>
      effectRuntime.runPromise(
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
