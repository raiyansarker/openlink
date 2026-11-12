import { createFileRoute } from '@tanstack/react-router'
import { getAuth } from '#/server/auth/instance'
import { apiError, readJsonBody } from '#/server/api/http'
import { toUserDto } from '#/server/api/serializers'

type SignInBody = { email: string; password: string }

export const Route = createFileRoute('/api/v1/auth/sign-in')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await readJsonBody<SignInBody>(request)
        if (body instanceof Response) return body

        const response = await getAuth().api.signInEmail({
          body,
          asResponse: true,
        })

        if (!response.ok) {
          return apiError(401, 'unauthorized', 'Invalid email or password')
        }

        const payload = (await response.json()) as {
          user?: { id: string; email: string; name: string; createdAt: string | Date }
        }

        if (!payload.user) {
          return apiError(401, 'unauthorized', 'Invalid email or password')
        }

        const headers = new Headers(response.headers)
        headers.set('content-type', 'application/json; charset=utf-8')

        return new Response(
          JSON.stringify({
            user: toUserDto({
              id: payload.user.id,
              email: payload.user.email,
              name: payload.user.name,
              createdAt: new Date(payload.user.createdAt),
            }),
          }),
          { status: 200, headers },
        )
      },
    },
  },
})
