import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { requireSession } from '#/server/auth/session'

export const Route = createFileRoute('/api/v1/auth/session')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await requireSession(request)
        if (!session) {
          return json({ authenticated: false, user: null })
        }
        return json({ authenticated: true, user: session.user })
      },
    },
  },
})
