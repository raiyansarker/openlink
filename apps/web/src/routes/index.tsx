import { createFileRoute } from '@tanstack/react-router'
import { Effect } from 'effect'
import { AuthSession } from '#/lib/auth/client'
import WorkspaceRedirect from '#/components/workspace/WorkspaceRedirect'
import { effectRuntime } from '#/server/effect/runtime'
import { Bindings } from '#/server/effect/services/bindings'
import { DomainHome } from '#/server/redirect/domain-home'

/**
 * On the app's own host: resolves the visitor's workspace, then forwards to it.
 * On a custom domain (`go.brand.com/`): a page saying it's a short-link domain.
 */
export const Route = createFileRoute('/')({
  server: {
    handlers: {
      GET: async ({ request, next }) => {
        const vanity = await effectRuntime.runPromise(
          Effect.gen(function* () {
            const { BETTER_AUTH_URL } = yield* Bindings
            return yield* DomainHome.respond({ host: new URL(request.url).host, appOrigin: BETTER_AUTH_URL || null })
          }).pipe(
            // Only a custom domain's lookup can fail: answer like a short link would, never with the app.
            Effect.catch(() =>
              Effect.succeed(new Response('Service unavailable', { status: 503, headers: { 'cache-control': 'no-store' } })),
            ),
          ),
        )
        return vanity ?? next()
      },
    },
  },
  beforeLoad: ({ location }) => AuthSession.requireSignedIn(location),
  component: () => <WorkspaceRedirect section="overview" />,
})
