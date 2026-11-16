import { createFileRoute } from '@tanstack/react-router'
import { Effect } from 'effect'

import { operation } from '#/server/effect/operations'
import { effectRuntime } from '#/server/effect/runtime'
import { Bindings } from '#/server/effect/services/bindings'
import { resolveRedirect } from '#/server/redirect/resolve'
import { RedirectResponses } from '#/server/redirect/response'
import { Visitor } from '#/server/redirect/visitor'

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
      const { BETTER_AUTH_URL } = yield* Bindings
      const appHost = URL.canParse(BETTER_AUTH_URL) ? new URL(BETTER_AUTH_URL).host : null
      const outcome = yield* resolveRedirect({
        host: new URL(request.url).host,
        slug,
        password,
        appHost,
        visitor: Visitor.fromRequest(request),
      })
      return RedirectResponses.for(outcome)
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
