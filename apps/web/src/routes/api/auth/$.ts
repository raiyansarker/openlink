import { createFileRoute } from '@tanstack/react-router'

import { AuthHandler } from '#/server/auth/handler'
import { effectRuntime } from '#/server/effect/runtime'

const serve = ({ request }: { request: Request }) => effectRuntime.runPromise(AuthHandler.serve(request))

export const Route = createFileRoute('/api/auth/$')({
  server: { handlers: { GET: serve, POST: serve } },
})
