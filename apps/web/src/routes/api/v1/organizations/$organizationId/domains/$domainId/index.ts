import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { and, eq } from 'drizzle-orm'
import { customDomain } from '@openlink/db/schema'
import { apiError } from '#/server/api/http'
import { toDomainDto } from '#/server/api/serializers'
import { requireSession } from '#/server/auth/session'
import { getDb } from '#/server/db'
import { removeCustomDomain } from '#/server/domain/service'
import { getMembership, isAdmin } from '#/server/org/access'

export const Route = createFileRoute(
  '/api/v1/organizations/$organizationId/domains/$domainId/',
)({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const session = await requireSession(request)
        if (!session) return apiError(401, 'unauthorized', 'Authentication required')

        const membership = await getMembership(session.session.user.id, params.organizationId)
        if (!membership) return apiError(404, 'not_found', 'Domain not found')

        const [row] = await getDb()
          .select()
          .from(customDomain)
          .where(
            and(
              eq(customDomain.id, params.domainId),
              eq(customDomain.organizationId, params.organizationId),
            ),
          )
          .limit(1)

        if (!row) return apiError(404, 'not_found', 'Domain not found')
        return json(toDomainDto(row))
      },
      DELETE: async ({ request, params }) => {
        const session = await requireSession(request)
        if (!session) return apiError(401, 'unauthorized', 'Authentication required')

        const membership = await getMembership(session.session.user.id, params.organizationId)
        if (!membership || !isAdmin(membership.role)) {
          return apiError(403, 'forbidden', 'Admin role required')
        }

        const removed = await removeCustomDomain(params.domainId)
        if (!removed) return apiError(404, 'not_found', 'Domain not found')

        return new Response(null, { status: 204 })
      },
    },
  },
})
