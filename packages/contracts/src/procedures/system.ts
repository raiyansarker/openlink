import { oc } from '@orpc/contract'

import { HealthResponse, OpenApiDocument } from '../models'

export const getHealth = oc
  .route({
    description:
      'Checks every runtime dependency the API relies on (D1, Analytics Engine, auth configuration, domain provider, and the oRPC OpenAPI contract).',
    inputStructure: 'detailed',
    method: 'GET',
    operationId: 'getHealth',
    path: '/health',
    summary: 'Dependency health probe',
    tags: ['System'],
  })
  .output(HealthResponse)

export const getOpenApiDocument = oc
  .route({
    inputStructure: 'detailed',
    method: 'GET',
    operationId: 'getOpenApiDocument',
    path: '/openapi.json',
    summary: 'OpenAPI document for this API',
    tags: ['System'],
  })
  .output(OpenApiDocument)
