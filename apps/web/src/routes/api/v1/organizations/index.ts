import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { apiError, readJsonBody } from '#/server/api/http'
import { toMembershipDto, toOrganizationDto } from '#/server/api/serializers'
import { requireSession } from '#/server/auth/session'
import {
  createOrganizationWithBootstrapInvite,
  listOrganizationsForUser,
} from '#/server/org/service'

type CreateOrganizationBody = {
  name: string
  slug: string
  inviteToken: string
}

export const Route = createFileRoute('/api/v1/organizations/')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await requireSession(request)
        if (!session) return apiError(401, 'unauthorized', 'Authentication required')

        const rows = await listOrganizationsForUser(session.session.user.id)
        return json({
          items: rows.map((row) => toMembershipDto(row.organization, row.member)),
        })
      },
      POST: async ({ request }) => {
        const session = await requireSession(request)
        if (!session) return apiError(401, 'unauthorized', 'Authentication required')

        const body = await readJsonBody<CreateOrganizationBody>(request)
        if (body instanceof Response) return body

        try {
          const org = await createOrganizationWithBootstrapInvite({
            userId: session.session.user.id,
            name: body.name,
            slug: body.slug,
            inviteToken: body.inviteToken,
          })
          return json(toOrganizationDto(org), { status: 201 })
        } catch (error) {
          if (error instanceof Error && error.message === 'invalid_bootstrap_invite') {
            return apiError(403, 'forbidden', 'Invalid or expired bootstrap invite token')
          }
          return apiError(409, 'conflict', 'Unable to create organization')
        }
      },
    },
  },
})
