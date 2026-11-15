import { createFileRoute } from '@tanstack/react-router'
import { Effect } from 'effect'

import { operation } from '#/server/effect/operations'
import { effectRuntime } from '#/server/effect/runtime'
import { resolveRedirect } from '#/server/redirect/resolve'
import { outcomeToResponse } from '#/server/redirect/response'

const unavailable = () =>
  new Response('Service unavailable', { status: 503, headers: { 'cache-control': 'no-store' } })

const readPassword = (request: Request) =>
  operation('redirect.readForm', async () => {
    const value = (await request.formData()).get('password')
    return typeof value === 'string' ? value : ''
  }).pipe(Effect.orElseSucceed(() => ''))

const serve = (request: Request, slug: string, withPassword: boolean) =>
  effectRuntime.runPromise(
    Effect.gen(function* () {
      const password = withPassword ? yield* readPassword(request) : undefined
      const outcome = yield* resolveRedirect({ host: new URL(request.url).host, slug, password })
      return outcomeToResponse(outcome)
    }).pipe(Effect.catch(() => Effect.succeed(unavailable()))),
  )

export const Route = createFileRoute('/$slug')({
  server: {
    handlers: {
      GET: ({ request, params }) => serve(request, params.slug, false),
      POST: ({ request, params }) => serve(request, params.slug, true),
    },
  },
})
