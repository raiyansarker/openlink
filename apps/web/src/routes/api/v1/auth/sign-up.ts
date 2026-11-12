import { createFileRoute } from '@tanstack/react-router'
import { getAuth } from '#/server/auth/instance'
import { apiError, readJsonBody } from '#/server/api/http'
import { toUserDto } from '#/server/api/serializers'

type SignUpBody = { email: string; password: string; name: string }

export const Route = createFileRoute('/api/v1/auth/sign-up')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await readJsonBody<SignUpBody>(request)
        if (body instanceof Response) return body
        if (!body.email || !body.password || !body.name) {
          return apiError(400, 'bad_request', 'email, password, and name are required')
        }

        try {
          const response = await getAuth().api.signUpEmail({
            body,
            asResponse: true,
          })

          const payload = (await response.json()) as {
            user?: { id: string; email: string; name: string; createdAt: string | Date }
          }

          if (!payload.user) {
            return apiError(500, 'internal_error', 'Sign up failed')
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
            { status: 201, headers },
          )
        } catch {
          return apiError(409, 'conflict', 'Unable to create account for this email')
        }
      },
    },
  },
})
