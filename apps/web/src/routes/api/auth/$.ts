import { createFileRoute } from '@tanstack/react-router'
import { Effect } from 'effect'

import { effectRuntime } from '#/server/effect/runtime'
import { authUnavailable, handleAuthRequest } from '#/server/auth/handler'

const serve = ({ request }: { request: Request }) =>
  effectRuntime.runPromise(
    handleAuthRequest(request).pipe(Effect.catch(() => Effect.succeed(authUnavailable()))),
  )

export const Route = createFileRoute('/api/auth/$')({
  server: { handlers: { GET: serve, POST: serve } },
})
