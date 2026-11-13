import { describe, expect, mock, test } from 'bun:test'
import type { createOpenLinkDomainClient } from '@openlink/domain'
import { Effect } from 'effect'
import type { getAuth } from '#/server/auth/instance'
import type { WorkerBindings } from '#/server/env'

import { Auth } from '#/server/effect/services/auth'
import { Bindings } from '#/server/effect/services/bindings'
import { DomainClient } from '#/server/effect/services/domain-client'
import { runHealthChecks } from './checks'

function fixture(options: {
  bindings?: Partial<WorkerBindings>
  first?: () => Promise<unknown>
  client?: object
} = {}) {
  const write = mock(() => {})
  const first = mock(options.first ?? (async () => ({ ok: 1 })))
  const prepare = mock((sql: string) => {
    expect(sql).toBe('SELECT 1 AS ok')
    return { first }
  })
  const bindings = {
    DB: { prepare },
    ANALYTICS: { writeDataPoint: write },
    BETTER_AUTH_SECRET: 'long-enough-test-secret',
    DOMAIN_PROVIDER: 'memory',
    ...options.bindings,
  } as unknown as WorkerBindings
  const client = (options.client ?? { provider: 'memory' }) as ReturnType<typeof createOpenLinkDomainClient>
  const effect = runHealthChecks().pipe(
    Effect.provideService(Bindings, bindings),
    Effect.provideService(Auth, {} as ReturnType<typeof getAuth>),
    Effect.provideService(DomainClient, client),
  )
  return { effect, write, first, prepare }
}

describe('runHealthChecks', () => {
  test('is lazy, preserves the public report and performs read-only probes', async () => {
    const f = fixture()
    expect(f.prepare).not.toHaveBeenCalled()
    const report = await Effect.runPromise(f.effect)
    expect(report.status).toBe('ok')
    expect(report.service).toBe('openlink')
    expect(Number.isNaN(Date.parse(report.checkedAt))).toBe(false)
    expect(report.checks.map(({ name, status, required }) => ({ name, status, required }))).toEqual([
      { name: 'd1', status: 'ok', required: true },
      { name: 'analytics_engine', status: 'ok', required: true },
      { name: 'auth', status: 'ok', required: true },
      { name: 'domain_provider', status: 'ok', required: true },
      { name: 'orpc_openapi_contract', status: 'ok', required: true },
    ])
    for (const check of report.checks) expect(check.latencyMs).toBeGreaterThanOrEqual(0)
    expect(report.checks[1]?.message).toBe('binding present')
    expect(report.checks[3]?.message).toBe('provider=memory')
    expect(f.write).not.toHaveBeenCalled()
    expect(f.first).toHaveBeenCalledTimes(1)
  })

  for (const [cause, message] of [[new Error('D1 offline'), 'D1 offline'], ['unavailable', 'D1 probe failed']] as const) {
    test(`returns a report instead of failing on D1 rejection: ${message}`, async () => {
      const f = fixture({ first: () => Promise.reject(cause) })
      const report = await Effect.runPromise(f.effect)
      expect(report.status).toBe('error')
      expect(report.checks[0]).toEqual({ name: 'd1', status: 'error', required: true, message })
      expect(report.checks.slice(1).every((check) => check.status === 'ok')).toBe(true)
    })
  }

  test('unexpected D1 result becomes an error entry', async () => {
    const report = await Effect.runPromise(fixture({ first: async () => ({ ok: 0 }) }).effect)
    expect(report.checks[0]?.message).toBe('unexpected probe result')
    expect(report.status).toBe('error')
  })

  test('missing bindings and invalid auth configuration retain public messages', async () => {
    const report = await Effect.runPromise(fixture({ bindings: {
      ANALYTICS: undefined,
      BETTER_AUTH_SECRET: 'short',
      DOMAIN_PROVIDER: 'cloudflare',
    } }).effect)
    expect(report.status).toBe('error')
    expect(report.checks[1]).toMatchObject({ status: 'error', message: 'ANALYTICS binding is not configured' })
    expect(report.checks[2]).toMatchObject({ status: 'error', message: 'BETTER_AUTH_SECRET is missing or too short' })
    expect(report.checks[3]).toMatchObject({
      status: 'error', message: 'Missing Cloudflare env: CF_API_TOKEN, CF_ZONE_ID, CF_SAAS_CNAME_TARGET',
    })
  })

  test('configured Cloudflare provider succeeds without calling provider APIs', async () => {
    const report = await Effect.runPromise(fixture({ bindings: {
      DOMAIN_PROVIDER: 'cloudflare', CF_API_TOKEN: 'test', CF_ZONE_ID: 'test', CF_SAAS_CNAME_TARGET: 'target',
    }, client: { provider: 'cloudflare' } }).effect)
    expect(report.checks[3]).toMatchObject({ status: 'ok', message: 'provider=cloudflare' })
  })

  test('missing provider id becomes an error entry', async () => {
    const report = await Effect.runPromise(fixture({ client: {} }).effect)
    expect(report.checks[3]).toEqual({
      name: 'domain_provider', status: 'error', required: true, message: 'domain client missing provider id',
    })
  })

  test('synchronous provider probe failures are converted to entries', async () => {
    const report = await Effect.runPromise(fixture({ client: {
      get provider() { throw new Error('provider unavailable') },
    } }).effect)
    expect(report.checks[3]?.message).toBe('provider unavailable')
    expect(report.status).toBe('error')
  })

  test('other probes run while the D1 probe is pending', async () => {
    let release!: (result: { ok: number }) => void
    const pending = new Promise<{ ok: number }>((resolve) => { release = resolve })
    let providerChecked = false
    const f = fixture({ first: () => pending, client: {
      get provider() { providerChecked = true; return 'memory' },
    } })
    const running = Effect.runPromise(f.effect)
    try {
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(f.first).toHaveBeenCalledTimes(1)
      expect(providerChecked).toBe(true)
    } finally {
      release({ ok: 1 })
    }
    expect((await running).status).toBe('ok')
  })
})
