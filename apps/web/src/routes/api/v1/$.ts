import { createFileRoute } from '@tanstack/react-router'
import { handleOpenApiRequest } from '#/server/orpc/openapi-handler'

async function serve({ request }: { request: Request }) {
  const { matched, response } = await handleOpenApiRequest(request)
  if (matched && response) return response
  return new Response(null, { status: 404 })
}

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
