import { contract } from '@openlink/contracts'
import { Effect } from 'effect'
import { BackendError, operation } from '#/server/effect/operations'
import { Auth } from '#/server/effect/services/auth'
import { Bindings } from '#/server/effect/services/bindings'
import { DomainClient } from '#/server/effect/services/domain-client'
import { resolveHealthReportStatus } from './report'

export type HealthCheckResult = {
  name: string
  status: 'ok' | 'error' | 'skipped'
  required: boolean
  message?: string
  latencyMs?: number
}

function probe<R>(
  name: string,
  fallback: string,
  check: Effect.Effect<string | undefined, BackendError, R>,
): Effect.Effect<HealthCheckResult, never, R> {
  return Effect.gen(function* () {
    const start = performance.now()
    const message = yield* check
    return {
      name,
      status: 'ok' as const,
      required: true,
      latencyMs: Math.round(performance.now() - start),
      ...(message === undefined ? {} : { message }),
    }
  }).pipe(
    Effect.catchTag('BackendError', ({ cause }) => Effect.succeed({
      name,
      status: 'error' as const,
      required: true,
      message: cause instanceof Error ? cause.message : fallback,
    })),
  )
}

function checkD1() {
  return probe('d1', 'D1 probe failed', Effect.gen(function* () {
    const bindings = yield* Bindings
    const result = yield* operation('health.d1', () =>
      bindings.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>(),
    )
    if (result?.ok !== 1) {
      return yield* Effect.fail(
        new BackendError({ operation: 'health.d1', cause: new Error('unexpected probe result') }),
      )
    }
    return undefined
  }))
}

function checkAnalyticsEngine() {
  return probe('analytics_engine', 'Analytics binding check failed', Effect.gen(function* () {
    const bindings = yield* Bindings
    yield* operation('health.analytics_engine', () => {
      if (!bindings.ANALYTICS) throw new Error('ANALYTICS binding is not configured')
    })
    return 'binding present'
  }))
}

function checkAuth() {
  return probe('auth', 'Auth initialization failed', Effect.gen(function* () {
    const bindings = yield* Bindings
    yield* operation('health.auth.configuration', () => {
      if (!bindings.BETTER_AUTH_SECRET || bindings.BETTER_AUTH_SECRET.length < 16) {
        throw new Error('BETTER_AUTH_SECRET is missing or too short')
      }
    })
    // Resolving the injected instance replaces initializing auth in the probe.
    yield* Auth
    return undefined
  }))
}

function checkDomainProvider() {
  return probe('domain_provider', 'Domain provider check failed', Effect.gen(function* () {
    const bindings = yield* Bindings
    const mode = bindings.DOMAIN_PROVIDER ?? 'memory'
    yield* operation('health.domain_provider.configuration', () => {
      if (mode === 'cloudflare') {
        const missing = ['CF_API_TOKEN', 'CF_ZONE_ID', 'CF_SAAS_CNAME_TARGET'].filter(
          (key) => !bindings[key as keyof typeof bindings],
        )
        if (missing.length > 0) {
          throw new Error(`Missing Cloudflare env: ${missing.join(', ')}`)
        }
      }
    })
    const client = yield* DomainClient
    yield* operation('health.domain_provider', () => {
      if (!client.provider) throw new Error('domain client missing provider id')
    })
    return `provider=${mode}`
  }))
}

function checkOpenApiContract() {
  return probe('orpc_openapi_contract', 'Contract invalid', Effect.gen(function* () {
    yield* operation('health.orpc_openapi_contract', () => {
      if (!contract.system?.getHealth || !contract.system?.getOpenApiDocument) {
        throw new Error('oRPC OpenAPI contract is missing required procedures')
      }
    })
    return undefined
  }))
}

export type HealthReport = {
  status: 'ok' | 'degraded' | 'error'
  service: 'openlink'
  checkedAt: string
  checks: HealthCheckResult[]
}

export function runHealthChecks(): Effect.Effect<HealthReport, never, Bindings | Auth | DomainClient> {
  return Effect.gen(function* () {
    const checks = yield* Effect.all([
      checkD1(),
      checkAnalyticsEngine(),
      checkAuth(),
      checkDomainProvider(),
      checkOpenApiContract(),
    ], { concurrency: 'unbounded' })

    return {
      status: resolveHealthReportStatus(checks),
      service: 'openlink',
      checkedAt: new Date().toISOString(),
      checks,
    }
  })
}
