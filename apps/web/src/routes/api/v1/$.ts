import { createFileRoute } from '@tanstack/react-router'
import { Effect } from 'effect'
import { operation } from '#/server/effect/operations'
import { handleOpenApiRequest } from '#/server/orpc/openapi-handler'

const serve = ({ request }: { request: Request }) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const { matched, response } = yield* operation('api.handle', () =>
        handleOpenApiRequest(request),
      )
      return matched && response ? response : new Response(null, { status: 404 })
    }),
  )

export const Route = createFileRoute('/api/v1/$')({
  server: {
    handlers: {
      GET: serve,
      POST: serve,
      PATCH: serve,
      PUT: serve,
      DELETE: serve,
    },
  },
})
