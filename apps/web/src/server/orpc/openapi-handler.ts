import { OpenAPIHandler, type OpenAPIHandlerOptions } from '@orpc/openapi/fetch'
import { COMMON_ERROR_STATUS_MAP, ORPCError, onError } from '@orpc/server'
import { CORSPlugin } from '@orpc/server/plugins'
import type { StandardHandlerPlugin } from '@orpc/server/standard'
import { ArkTypeToJsonSchemaConverter } from '@orpc/arktype'
import { SmartCoercionHandlerPlugin } from '@orpc/json-schema'
import { mergeStandardHeaders } from '@standard-server/core'
import { Effect } from 'effect'
import { operation } from '#/server/effect/operations'
import { effectRuntime } from '#/server/effect/runtime'
import { ServerLog } from '#/server/observability'
import { createApiContext, type ApiContext } from './context'
import { FormOrigin } from './form-origin'
import { router } from './router'
import { Bindings } from '#/server/effect/services/bindings'

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

const handlerOptions = (extraPlugins: StandardHandlerPlugin<ApiContext>[] = []): OpenAPIHandlerOptions<ApiContext> => ({
  plugins: [
    // Public API: any origin. Credentials stay off, so cross-origin callers use `Authorization: Bearer <api key>`.
    new CORSPlugin<ApiContext>({
      origin: '*',
      maxAge: 60 * 60 * 24,
      exposeHeaders: ['retry-after'],
    }),
    ...extraPlugins,
  ],
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

export const openApiHandler = new OpenAPIHandler<ApiContext>(router, handlerOptions())

/**
 * For requests that carry a file (`multipart/form-data`). Every form field arrives as text, so
 * numbers and booleans are converted to what the contract expects before validation. JSON
 * requests keep strict types and use `openApiHandler`.
 */
const formApiHandler = new OpenAPIHandler<ApiContext>(
  router,
  handlerOptions([new SmartCoercionHandlerPlugin<ApiContext>({ converters: [new ArkTypeToJsonSchemaConverter()] })]),
)

const isMultipart = (request: Request) =>
  (request.headers.get('content-type') ?? '').toLowerCase().startsWith('multipart/form-data')

/** Edge adapter: the HTTP framework consumes a Promise. */
export const handleOpenApiRequest = async (request: Request) => {
  if (FormOrigin.needsCheck(request)) {
    const bindings = await effectRuntime.runPromise(Effect.gen(function* () { return yield* Bindings }))
    if (!FormOrigin.isTrusted(request, bindings)) return { matched: true as const, response: FormOrigin.response() }
  }
  return (isMultipart(request) ? formApiHandler : openApiHandler).handle(request, {
    prefix: '/api/v1',
    context: () => createApiContext(request),
  })
}
