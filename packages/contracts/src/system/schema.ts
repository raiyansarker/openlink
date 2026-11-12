import { type } from 'arktype'

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

/** OpenAPI 3.x document returned from `GET /openapi.json`. */
export const OpenApiDocument = type({ '[string]': 'unknown' })

/** 204 / empty success bodies. */
export const EmptyResponse = type('undefined')
