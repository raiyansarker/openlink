import { createFileRoute } from '@tanstack/react-router'
import { Effect } from 'effect'
import { Cors } from '#/server/http/cors'
import { operation } from '#/server/effect/operations'
import { effectRuntime } from '#/server/effect/runtime'
import { handleOpenApiRequest } from '#/server/orpc/openapi-handler'

const failed = () =>
  Response.json(
    { code: 'INTERNAL_SERVER_ERROR', status: 500, message: 'Internal server error' },
    { status: 500, headers: { 'cache-control': 'no-store' } },
  )

const handle = ({ request }: { request: Request }) =>
  effectRuntime.runPromise(
    Effect.gen(function* () {
      const { matched, response } = yield* operation('api.handle', () =>
        handleOpenApiRequest(request),
      )
      return matched && response ? response : new Response(null, { status: 404 })
    }).pipe(
      // Procedure failures are answered (and logged) by oRPC; this is for anything that escapes it.
      Effect.catchCause((cause) => Effect.logError('api.request_failed', cause).pipe(Effect.as(failed()))),
      Effect.annotateLogs({ method: request.method, path: new URL(request.url).pathname }),
      Effect.withSpan('api.request'),
    ),
  )

const serve = async (ctx: { request: Request }) => Cors.apply(await handle(ctx))

const preflight = ({ request }: { request: Request }) => Cors.preflight(request)

export const Route = createFileRoute('/api/v1/$')({
  server: {
    handlers: {
      GET: serve,
      POST: serve,
      PATCH: serve,
      PUT: serve,
      DELETE: serve,
      OPTIONS: preflight,
    },
  },
})
