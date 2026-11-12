import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { link } from '@openlink/db/schema'
import { apiError, readJsonBody } from '#/server/api/http'
import { toLinkDto } from '#/server/api/serializers'
import { requireSession } from '#/server/auth/session'
import { getDb } from '#/server/db'
import { createHash } from 'node:crypto'
import { getLinkInDomain } from '#/server/links/service'

function hashPassword(password: string) {
  return createHash('sha256').update(password).digest('hex')
}
import { getMembership } from '#/server/org/access'

type UpdateLinkBody = {
  destinationUrl?: string
  title?: string
  description?: string
  redirectStatus?: number
  status?: (typeof link.$inferSelect)['status']
  enabled?: boolean
  activateAt?: string
  expiresAt?: string
  maxClicks?: number
  password?: string
  clearPassword?: boolean
  expiredDestinationUrl?: string
  fallbackDestinationUrl?: string
  tags?: string[]
  utm?: Record<string, string>
  metadata?: Record<string, unknown>
}

export const Route = createFileRoute(
  '/api/v1/organizations/$organizationId/domains/$domainId/links/$linkId',
)({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const session = await requireSession(request)
        if (!session) return apiError(401, 'unauthorized', 'Authentication required')

        const membership = await getMembership(session.session.user.id, params.organizationId)
        if (!membership) return apiError(404, 'not_found', 'Link not found')

        const row = await getLinkInDomain(params.domainId, params.linkId)
        if (!row || row.organizationId !== params.organizationId) {
          return apiError(404, 'not_found', 'Link not found')
        }

        return json(toLinkDto(row))
      },
      PATCH: async ({ request, params }) => {
        const session = await requireSession(request)
        if (!session) return apiError(401, 'unauthorized', 'Authentication required')

        const membership = await getMembership(session.session.user.id, params.organizationId)
        if (!membership) return apiError(403, 'forbidden', 'Organization membership required')

        const body = await readJsonBody<UpdateLinkBody>(request)
        if (body instanceof Response) return body

        const existing = await getLinkInDomain(params.domainId, params.linkId)
        if (!existing || existing.organizationId !== params.organizationId) {
          return apiError(404, 'not_found', 'Link not found')
        }

        const now = new Date()
        const passwordHash =
          body.clearPassword === true
            ? null
            : body.password
              ? hashPassword(body.password)
              : existing.passwordHash

        const [updated] = await getDb()
          .update(link)
          .set({
            destinationUrl: body.destinationUrl ?? existing.destinationUrl,
            title: body.title ?? existing.title,
            description: body.description ?? existing.description,
            redirectStatus: body.redirectStatus ?? existing.redirectStatus,
            status: body.status ?? existing.status,
            enabled: body.enabled ?? existing.enabled,
            activateAt: body.activateAt ? new Date(body.activateAt) : existing.activateAt,
            expiresAt: body.expiresAt ? new Date(body.expiresAt) : existing.expiresAt,
            maxClicks: body.maxClicks ?? existing.maxClicks,
            passwordHash,
            expiredDestinationUrl:
              body.expiredDestinationUrl ?? existing.expiredDestinationUrl,
            fallbackDestinationUrl:
              body.fallbackDestinationUrl ?? existing.fallbackDestinationUrl,
            tagsJson: body.tags ? JSON.stringify(body.tags) : existing.tagsJson,
            utmJson: body.utm ? JSON.stringify(body.utm) : existing.utmJson,
            metadataJson: body.metadata
              ? JSON.stringify(body.metadata)
              : existing.metadataJson,
            updatedAt: now,
          })
          .where(eq(link.id, params.linkId))
          .returning()

        return json(toLinkDto(updated!))
      },
      DELETE: async ({ request, params }) => {
        const session = await requireSession(request)
        if (!session) return apiError(401, 'unauthorized', 'Authentication required')

        const membership = await getMembership(session.session.user.id, params.organizationId)
        if (!membership) return apiError(403, 'forbidden', 'Organization membership required')

        const existing = await getLinkInDomain(params.domainId, params.linkId)
        if (!existing || existing.organizationId !== params.organizationId) {
          return apiError(404, 'not_found', 'Link not found')
        }

        await getDb().delete(link).where(eq(link.id, params.linkId))
        return new Response(null, { status: 204 })
      },
    },
  },
})
