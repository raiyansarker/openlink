import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { customDomain } from '@openlink/db/schema'
import { apiError, readJsonBody } from '#/server/api/http'
import { toDomainDto } from '#/server/api/serializers'
import { requireSession } from '#/server/auth/session'
import { getDb } from '#/server/db'
import { registerCustomDomain } from '#/server/domain/service'
import { getMembership } from '#/server/org/access'

type AddDomainBody = { hostname: string }

export const Route = createFileRoute('/api/v1/organizations/$organizationId/domains/')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const session = await requireSession(request)
        if (!session) return apiError(401, 'unauthorized', 'Authentication required')

        const membership = await getMembership(session.session.user.id, params.organizationId)
        if (!membership) return apiError(401, 'unauthorized', 'Authentication required')

        const rows = await getDb()
          .select()
          .from(customDomain)
          .where(eq(customDomain.organizationId, params.organizationId))

        return json({ items: rows.map(toDomainDto) })
      },
      POST: async ({ request, params }) => {
        const session = await requireSession(request)
        if (!session) return apiError(401, 'unauthorized', 'Authentication required')

        const membership = await getMembership(session.session.user.id, params.organizationId)
        if (!membership) return apiError(403, 'forbidden', 'Organization membership required')

        const body = await readJsonBody<AddDomainBody>(request)
        if (body instanceof Response) return body
        if (!body.hostname) return apiError(400, 'bad_request', 'hostname is required')

        try {
          const row = await registerCustomDomain({
            organizationId: params.organizationId,
            hostname: body.hostname,
          })
          return json(toDomainDto(row), { status: 201 })
        } catch {
          return apiError(400, 'bad_request', 'Unable to register domain')
        }
      },
    },
  },
})
