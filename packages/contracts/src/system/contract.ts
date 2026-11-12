import { oc, openapi } from '../oc'
import { HealthResponse, OpenApiDocument } from './schema'

export const getHealth = oc
  .meta(
    openapi({
      description:
        'Checks every runtime dependency the API relies on (D1, Analytics Engine, auth configuration, domain provider, and the oRPC OpenAPI contract).',
      method: 'GET',
      operationId: 'getHealth',
      path: '/health',
      summary: 'Dependency health probe',
      tags: ['System'],
    }),
  )
  .output(HealthResponse)

export const getOpenApiDocument = oc
  .meta(
    openapi({
      method: 'GET',
      operationId: 'getOpenApiDocument',
      path: '/openapi.json',
      summary: 'OpenAPI document for this API',
      tags: ['System'],
    }),
  )
  .output(OpenApiDocument)

export const contract = {
  getHealth,
  getOpenApiDocument,
} as const
