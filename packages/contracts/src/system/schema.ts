import { type } from 'arktype'

/**
 * HTTP(S) URL. Avoid ArkType's `string.url` — its predicate cannot convert to OpenAPI JSON Schema.
 */
export const HttpUrl = type(/^https?:\/\/\S+$/)

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

/**
 * 204 / empty success bodies.
 * ArkType cannot emit JSON Schema for `undefined`; use an empty object in OpenAPI.
 */
export const EmptyResponse = type({})
