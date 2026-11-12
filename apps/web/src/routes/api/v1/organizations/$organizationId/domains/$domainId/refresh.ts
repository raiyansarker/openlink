import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { and, eq } from 'drizzle-orm'
import { customDomain } from '@openlink/db/schema'
import { apiError } from '#/server/api/http'
import { toDomainDto } from '#/server/api/serializers'
import { requireSession } from '#/server/auth/session'
import { getDb } from '#/server/db'
import { refreshCustomDomain } from '#/server/domain/service'
import { getMembership } from '#/server/org/access'

export const Route = createFileRoute(
  '/api/v1/organizations/$organizationId/domains/$domainId/refresh',
)({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
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

        const updated = await refreshCustomDomain(params.domainId)
        return json(toDomainDto(updated ?? row))
      },
    },
  },
})
