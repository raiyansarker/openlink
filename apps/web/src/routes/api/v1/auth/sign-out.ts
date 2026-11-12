import { createFileRoute } from '@tanstack/react-router'
import { getAuth } from '#/server/auth/instance'

export const Route = createFileRoute('/api/v1/auth/sign-out')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const response = await getAuth().api.signOut({
          headers: request.headers,
          asResponse: true,
        })
        return new Response(null, { status: 204, headers: response.headers })
      },
    },
  },
})
