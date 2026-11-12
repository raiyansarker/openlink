import { contract } from '@openlink/contracts'
import { createOpenLinkDomainClient } from '@openlink/domain'
import { getAuth } from '../auth/instance'
import { getBindings } from '../env'
import { resolveHealthReportStatus } from './report'

export type HealthCheckResult = {
  name: string
  status: 'ok' | 'error' | 'skipped'
  required: boolean
  message?: string
  latencyMs?: number
}

async function timed<T>(fn: () => Promise<T> | T): Promise<{ value: T; latencyMs: number }> {
  const start = performance.now()
  const value = await fn()
  return { value, latencyMs: Math.round(performance.now() - start) }
}

async function checkD1(): Promise<HealthCheckResult> {
  try {
    const { latencyMs } = await timed(async () => {
      const result = await getBindings().DB.prepare('SELECT 1 AS ok').first<{ ok: number }>()
      if (result?.ok !== 1) throw new Error('unexpected probe result')
    })
    return { name: 'd1', status: 'ok', required: true, latencyMs }
  } catch (error) {
    return {
      name: 'd1',
      status: 'error',
      required: true,
      message: error instanceof Error ? error.message : 'D1 probe failed',
    }
  }
}

async function checkAnalyticsEngine(): Promise<HealthCheckResult> {
  try {
    const { latencyMs } = await timed(() => {
      getBindings().ANALYTICS.writeDataPoint({
        blobs: ['health'],
        doubles: [0],
        indexes: ['health-check'],
      })
    })
    return { name: 'analytics_engine', status: 'ok', required: true, latencyMs }
  } catch (error) {
    return {
      name: 'analytics_engine',
      status: 'error',
      required: true,
      message: error instanceof Error ? error.message : 'Analytics write failed',
    }
  }
}

async function checkAuth(): Promise<HealthCheckResult> {
  try {
    const bindings = getBindings()
    if (!bindings.BETTER_AUTH_SECRET || bindings.BETTER_AUTH_SECRET.length < 16) {
      return {
        name: 'auth',
        status: 'error',
        required: true,
        message: 'BETTER_AUTH_SECRET is missing or too short',
      }
    }

    const { latencyMs } = await timed(() => {
      getAuth()
    })

    return { name: 'auth', status: 'ok', required: true, latencyMs }
  } catch (error) {
    return {
      name: 'auth',
      status: 'error',
      required: true,
      message: error instanceof Error ? error.message : 'Auth initialization failed',
    }
  }
}

async function checkDomainProvider(): Promise<HealthCheckResult> {
  try {
    const bindings = getBindings()
    const mode = bindings.DOMAIN_PROVIDER ?? 'memory'

    if (mode === 'cloudflare') {
      const missing = ['CF_API_TOKEN', 'CF_ZONE_ID', 'CF_SAAS_CNAME_TARGET'].filter(
        (key) => !bindings[key as keyof typeof bindings],
      )
      if (missing.length > 0) {
        return {
          name: 'domain_provider',
          status: 'error',
          required: true,
          message: `Missing Cloudflare env: ${missing.join(', ')}`,
        }
      }
    }

    const { latencyMs } = await timed(() => {
      const client = createOpenLinkDomainClient(bindings)
      if (!client.provider) throw new Error('domain client missing provider id')
    })

    return {
      name: 'domain_provider',
      status: 'ok',
      required: true,
      latencyMs,
      message: `provider=${mode}`,
    }
  } catch (error) {
    return {
      name: 'domain_provider',
      status: 'error',
      required: true,
      message: error instanceof Error ? error.message : 'Domain provider check failed',
    }
  }
}

async function checkOpenApiContract(): Promise<HealthCheckResult> {
  try {
    const { latencyMs } = await timed(() => {
      if (!contract.getHealth || !contract.getOpenApiDocument) {
        throw new Error('oRPC OpenAPI contract is missing required procedures')
      }
    })
    return { name: 'orpc_openapi_contract', status: 'ok', required: true, latencyMs }
  } catch (error) {
    return {
      name: 'orpc_openapi_contract',
      status: 'error',
      required: true,
      message: error instanceof Error ? error.message : 'Contract invalid',
    }
  }
}

export type HealthReport = {
  status: 'ok' | 'degraded' | 'error'
  service: 'openlink'
  checkedAt: string
  checks: HealthCheckResult[]
}

export async function runHealthChecks(): Promise<HealthReport> {
  const checks = await Promise.all([
    checkD1(),
    checkAnalyticsEngine(),
    checkAuth(),
    checkDomainProvider(),
    checkOpenApiContract(),
  ])

  const status = resolveHealthReportStatus(checks)

  return {
    status,
    service: 'openlink',
    checkedAt: new Date().toISOString(),
    checks,
  }
}
