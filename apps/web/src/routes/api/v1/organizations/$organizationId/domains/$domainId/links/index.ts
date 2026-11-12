import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { and, eq } from 'drizzle-orm'
import { customDomain } from '@openlink/db/schema'
import { apiError, readJsonBody } from '#/server/api/http'
import { toLinkDto } from '#/server/api/serializers'
import { requireSession } from '#/server/auth/session'
import { getDb } from '#/server/db'
import { createLinkRecord, listLinksForDomain } from '#/server/links/service'
import { getMembership } from '#/server/org/access'

type CreateLinkBody = {
  slug?: string
  destinationUrl: string
  title?: string
  description?: string
  redirectStatus?: number
  activateAt?: string
  expiresAt?: string
  maxClicks?: number
  password?: string
  expiredDestinationUrl?: string
  fallbackDestinationUrl?: string
  tags?: string[]
  utm?: Record<string, string>
  metadata?: Record<string, unknown>
}

export const Route = createFileRoute(
  '/api/v1/organizations/$organizationId/domains/$domainId/links/',
)({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const session = await requireSession(request)
        if (!session) return apiError(401, 'unauthorized', 'Authentication required')

        const membership = await getMembership(session.session.user.id, params.organizationId)
        if (!membership) return apiError(401, 'unauthorized', 'Authentication required')

        const rows = await listLinksForDomain(params.domainId)
        return json({ items: rows.map(toLinkDto) })
      },
      POST: async ({ request, params }) => {
        const session = await requireSession(request)
        if (!session) return apiError(401, 'unauthorized', 'Authentication required')

        const membership = await getMembership(session.session.user.id, params.organizationId)
        if (!membership) return apiError(403, 'forbidden', 'Organization membership required')

        const [domain] = await getDb()
          .select()
          .from(customDomain)
          .where(
            and(
              eq(customDomain.id, params.domainId),
              eq(customDomain.organizationId, params.organizationId),
            ),
          )
          .limit(1)

        if (!domain) return apiError(404, 'not_found', 'Domain not found')

        const body = await readJsonBody<CreateLinkBody>(request)
        if (body instanceof Response) return body
        if (!body.destinationUrl) {
          return apiError(400, 'bad_request', 'destinationUrl is required')
        }

        try {
          const row = await createLinkRecord({
            organizationId: params.organizationId,
            domainId: params.domainId,
            userId: session.session.user.id,
            slug: body.slug,
            destinationUrl: body.destinationUrl,
            title: body.title,
            description: body.description,
            redirectStatus: body.redirectStatus,
            activateAt: body.activateAt ? new Date(body.activateAt) : undefined,
            expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
            maxClicks: body.maxClicks,
            password: body.password,
            expiredDestinationUrl: body.expiredDestinationUrl,
            fallbackDestinationUrl: body.fallbackDestinationUrl,
            tags: body.tags,
            utm: body.utm,
            metadata: body.metadata,
          })

          return json(toLinkDto(row), { status: 201 })
        } catch (error) {
          if (error instanceof Error && error.message === 'slug_conflict') {
            return apiError(409, 'conflict', 'Slug already exists on this domain')
          }
          return apiError(400, 'bad_request', 'Unable to create link')
        }
      },
    },
  },
})
