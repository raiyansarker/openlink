import { describe, expect, test } from 'bun:test'
import type { OpenLinkDb } from '@openlink/db'
import type { customDomain } from '@openlink/db/schema'
import type { createOpenLinkDomainClient } from '@openlink/domain'
import { Effect } from 'effect'
import type { WorkerBindings } from '#/server/env'

import { Db } from '#/server/effect/services/db'
import { Bindings } from '#/server/effect/services/bindings'
import { DomainClient } from '#/server/effect/services/domain-client'
import { registerCustomDomain, refreshCustomDomain, removeCustomDomain } from './service'

type Row = typeof customDomain.$inferSelect

function fixture(options: {
  missing?: boolean
  status?: string
  providerId?: string
  activeAt?: Date | null
  fail?: string
  cause?: unknown
  provider?: 'memory' | 'cloudflare'
} = {}) {
  const calls: string[] = []
  const row = {
    id: 'domain-1', organizationId: 'org-1', hostname: 'links.example.com',
    providerDomainId: 'old-provider-id', activeAt: options.activeAt ?? null,
  } as Row
  let values: Record<string, unknown> = {}
  function step<A>(name: string, value: A): Promise<A> {
    calls.push(name)
    return options.fail === name ? Promise.reject(options.cause) : Promise.resolve(value)
  }
  const db = {
    select: () => ({ from: () => ({ where: () => ({
      limit: () => step('select', options.missing ? [] : [row]),
    }) }) }),
    insert: () => ({ values: (input: Record<string, unknown>) => {
      values = input
      return { returning: () => step('insert', [{ ...row, ...input }]) }
    } }),
    update: () => ({ set: (input: Record<string, unknown>) => {
      values = input
      return { where: () => ({ returning: () => step('update', [{ ...row, ...input }]) }) }
    } }),
    delete: () => ({ where: () => step('delete', undefined) }),
  } as unknown as OpenLinkDb
  const remote = {
    id: options.providerId,
    hostname: 'normalized.example.com',
    status: options.status ?? 'pending_verification',
    records: [
      { type: 'CNAME', name: 'links', value: 'target', purpose: 'other', status: 'valid' },
      { type: 'TXT', name: '_verify', value: 'token', purpose: 'verification', status: 'invalid' },
      { type: 'TXT', name: '_pending', value: 'token', purpose: 'verification', status: 'pending' },
    ],
  }
  const client = {
    add: (hostname: string) => { expect(hostname).toBe('links.example.com'); return step('add', remote) },
    refresh: (hostname: string) => { expect(hostname).toBe(row.hostname); return step('refresh', remote) },
    remove: (hostname: string) => { expect(hostname).toBe(row.hostname); return step('remove', undefined) },
  } as unknown as ReturnType<typeof createOpenLinkDomainClient>
  const provide = <A, E>(effect: Effect.Effect<A, E, Db | Bindings | DomainClient>) => effect.pipe(
    Effect.provideService(Db, db),
    Effect.provideService(Bindings, { DOMAIN_PROVIDER: options.provider ?? 'memory' } as WorkerBindings),
    Effect.provideService(DomainClient, client),
  )
  return { calls, row, provide, values: () => values }
}

const input = { organizationId: 'org-1', hostname: 'links.example.com' }

describe('domain service effects', () => {
  test('registration is lazy and preserves provider, readiness and DNS mappings', async () => {
    const f = fixture({ provider: 'cloudflare', providerId: 'remote-1' })
    const effect = f.provide(registerCustomDomain(input))
    expect(f.calls).toEqual([])
    const row = await Effect.runPromise(effect)
    expect(f.calls).toEqual(['add', 'insert'])
    expect(row).toMatchObject({
      organizationId: 'org-1', hostname: 'normalized.example.com',
      readiness: 'pending', provider: 'cloudflare', providerDomainId: 'remote-1',
    })
    expect(row.id).toBeString()
    expect(JSON.parse(row.dnsRecordsJson)).toEqual([
      { type: 'CNAME', host: 'links', value: 'target', purpose: 'routing', status: 'verified' },
      { type: 'TXT', host: '_verify', value: 'token', purpose: 'verification', status: 'failed' },
      { type: 'TXT', host: '_pending', value: 'token', purpose: 'verification', status: 'required' },
    ])
  })

  test('refresh preserves the original activation and provider id when absent remotely', async () => {
    const activeAt = new Date('2026-01-01')
    const f = fixture({ status: 'active', activeAt })
    const result = await Effect.runPromise(f.provide(refreshCustomDomain('domain-1')))
    expect(f.calls).toEqual(['select', 'refresh', 'update'])
    expect(result).toMatchObject({ readiness: 'active', activeAt, providerDomainId: 'old-provider-id' })
  })

  test('refresh sets activation time on first activation', async () => {
    const f = fixture({ status: 'active', providerId: 'new-id' })
    await Effect.runPromise(f.provide(refreshCustomDomain('domain-1')))
    expect(f.values().activeAt).toBeInstanceOf(Date)
    expect(f.values().providerDomainId).toBe('new-id')
  })

  for (const [status, readiness] of [['misconfigured', 'failed'], ['failed', 'failed'], ['pending_dns', 'pending'], ['unknown', 'verifying']]) {
    test(`refresh maps ${status} to ${readiness}`, async () => {
      const f = fixture({ status })
      await Effect.runPromise(f.provide(refreshCustomDomain('domain-1')))
      expect(f.values().readiness).toBe(readiness)
      expect(f.values().activeAt).toBeNull()
    })
  }

  test('missing rows short-circuit without needing a provider', async () => {
    const f = fixture({ missing: true })
    expect(await Effect.runPromise(f.provide(refreshCustomDomain('missing')))).toBeNull()
    expect(await Effect.runPromise(f.provide(removeCustomDomain('missing', 'org-1')))).toBe(false)
    expect(f.calls).toEqual(['select', 'select'])
  })

  test('remove deletes the DB row only after provider removal', async () => {
    const f = fixture()
    expect(await Effect.runPromise(f.provide(removeCustomDomain('domain-1', 'org-1')))).toBe(true)
    expect(f.calls).toEqual(['select', 'remove', 'delete'])
  })

  for (const [fail, operation, workflow] of [
    ['add', 'domain.register.provider', () => registerCustomDomain(input)],
    ['insert', 'domain.register.insert', () => registerCustomDomain(input)],
    ['select', 'domain.refresh.select', () => refreshCustomDomain('domain-1')],
    ['refresh', 'domain.refresh.provider', () => refreshCustomDomain('domain-1')],
    ['update', 'domain.refresh.update', () => refreshCustomDomain('domain-1')],
    ['select', 'domain.remove.select', () => removeCustomDomain('domain-1', 'org-1')],
    ['remove', 'domain.remove.provider', () => removeCustomDomain('domain-1', 'org-1')],
    ['delete', 'domain.remove.delete', () => removeCustomDomain('domain-1', 'org-1')],
  ] as const) {
    test(`${operation} exposes a typed failure and stops the workflow`, async () => {
      const cause = new Error('unavailable')
      const f = fixture({ fail, cause })
      const error = await Effect.runPromise(f.provide(workflow()).pipe(
        Effect.catchTag('BackendError', (error) => Effect.succeed(error)),
      ))
      expect(error).toMatchObject({ _tag: 'BackendError', operation, cause })
      expect(f.calls.at(-1)).toBe(fail)
    })
  }
})
