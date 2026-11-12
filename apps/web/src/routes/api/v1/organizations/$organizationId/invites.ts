import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { apiError, readJsonBody } from '#/server/api/http'
import { requireSession } from '#/server/auth/session'
import { getMembership, isAdmin } from '#/server/org/access'
import { createMemberInvite } from '#/server/org/service'

type InviteBody = { email: string; role: 'admin' | 'member' }

export const Route = createFileRoute('/api/v1/organizations/$organizationId/invites')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const session = await requireSession(request)
        if (!session) return apiError(401, 'unauthorized', 'Authentication required')

        const membership = await getMembership(session.session.user.id, params.organizationId)
        if (!membership || !isAdmin(membership.role)) {
          return apiError(403, 'forbidden', 'Admin role required')
        }

        const body = await readJsonBody<InviteBody>(request)
        if (body instanceof Response) return body

        const { invite, token } = await createMemberInvite({
          organizationId: params.organizationId,
          email: body.email,
          role: body.role,
          createdByUserId: session.session.user.id,
        })

        return json(
          {
            id: invite.id,
            organizationId: invite.organizationId,
            email: invite.email,
            role: invite.role,
            expiresAt: invite.expiresAt.toISOString(),
            token,
          },
          { status: 201 },
        )
      },
    },
  },
})
