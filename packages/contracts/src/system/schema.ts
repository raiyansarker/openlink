import { type } from 'arktype'

import { EmptyResponse, HttpUrl } from '../schema-utils'

export { EmptyResponse, HttpUrl }

export const HealthStatus = type("'ok' | 'degraded' | 'error'")
export const HealthCheckStatus = type("'ok' | 'error' | 'skipped'")

export const HealthCheck = type({
  name: 'string',
  status: HealthCheckStatus,
  'required?': 'boolean',
  'message?': 'string',
  'latencyMs?': 'number>=0',
})

export const HealthResponse = type({
  status: HealthStatus,
  service: "'openlink'",
  checkedAt: 'string',
  checks: HealthCheck.array(),
})

export const ErrorResponse = type({
  error: {
    code: 'string',
    message: 'string',
    'details?': type({ '[string]': 'unknown' }),
  },
})

export const OpenApiDocument = type({ '[string]': 'unknown' })
