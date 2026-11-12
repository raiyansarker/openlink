import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { apiError } from '#/server/api/http'
import { toOrganizationDto } from '#/server/api/serializers'
import { requireSession } from '#/server/auth/session'
import { getMembership } from '#/server/org/access'
import { getOrganizationById } from '#/server/org/service'

export const Route = createFileRoute('/api/v1/organizations/$organizationId/')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const session = await requireSession(request)
        if (!session) return apiError(401, 'unauthorized', 'Authentication required')

        const membership = await getMembership(session.session.user.id, params.organizationId)
        if (!membership) return apiError(404, 'not_found', 'Organization not found')

        const org = await getOrganizationById(params.organizationId)
        if (!org) return apiError(404, 'not_found', 'Organization not found')

        return json(toOrganizationDto(org))
      },
    },
  },
})
