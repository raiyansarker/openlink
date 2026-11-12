import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { apiError, readJsonBody } from '#/server/api/http'
import { toMembershipDto } from '#/server/api/serializers'
import { requireSession } from '#/server/auth/session'
import { acceptMemberInvite } from '#/server/org/service'

type AcceptBody = { token: string }

export const Route = createFileRoute('/api/v1/organizations/invites/accept')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await requireSession(request)
        if (!session) return apiError(401, 'unauthorized', 'Authentication required')

        const body = await readJsonBody<AcceptBody>(request)
        if (body instanceof Response) return body

        try {
          const { org, member } = await acceptMemberInvite({
            userId: session.session.user.id,
            token: body.token,
          })
          return json(toMembershipDto(org, member))
        } catch {
          return apiError(400, 'bad_request', 'Invalid or expired invite')
        }
      },
    },
  },
})
