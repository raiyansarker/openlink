import type { DnsRecord } from '@openlink/domain'
import { and, eq } from 'drizzle-orm'
import { Effect } from 'effect'
import { customDomain } from '@openlink/db/schema'
import { operation } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'
import { Bindings } from '#/server/effect/services/bindings'
import { DomainClient } from '#/server/effect/services/domain-client'

function mapReadiness(status: string): (typeof customDomain.$inferSelect)['readiness'] {
  if (status === 'active') return 'active'
  if (status === 'failed' || status === 'misconfigured') return 'failed'
  if (status.startsWith('pending')) return 'pending'
  return 'verifying'
}

function mapRecordStatus(status: DnsRecord['status']) {
  if (status === 'valid') return 'verified'
  if (status === 'invalid') return 'failed'
  return 'required'
}

function serializeDnsRecords(records: DnsRecord[]) {
  return JSON.stringify(
    records.map((record) => ({
      type: record.type,
      host: record.name,
      value: record.value,
      purpose: record.purpose === 'other' ? 'routing' : record.purpose,
      status: mapRecordStatus(record.status),
    })),
  )
}

export function refreshCustomDomain(domainId: string) {
  return Effect.gen(function* () {
    const db = yield* Db
    const [row] = yield* operation('domain.refresh.select', () =>
      db.select().from(customDomain).where(eq(customDomain.id, domainId)).limit(1),
    )
    if (!row) return null

    const client = yield* DomainClient
    const remote = yield* operation('domain.refresh.provider', () => client.refresh(row.hostname))
    const readiness = mapReadiness(remote.status)
    const activeAt = readiness === 'active' ? row.activeAt ?? new Date() : row.activeAt

    const [updated] = yield* operation('domain.refresh.update', () =>
      db
        .update(customDomain)
        .set({
          readiness,
          providerDomainId: remote.id ?? row.providerDomainId,
          dnsRecordsJson: serializeDnsRecords(remote.records ?? []),
          activeAt,
          updatedAt: new Date(),
        })
        .where(eq(customDomain.id, domainId))
        .returning(),
    )

    return updated ?? null
  })
}

export function registerCustomDomain(input: {
  organizationId: string
  hostname: string
}) {
  return Effect.gen(function* () {
    const db = yield* Db
    const bindings = yield* Bindings
    const client = yield* DomainClient
    const created = yield* operation('domain.register.provider', () => client.add(input.hostname))

    const id = crypto.randomUUID()
    const now = new Date()
    const provider = bindings.DOMAIN_PROVIDER === 'cloudflare' ? 'cloudflare' : 'memory'

    const [row] = yield* operation('domain.register.insert', () =>
      db
        .insert(customDomain)
        .values({
          id,
          organizationId: input.organizationId,
          hostname: created.hostname,
          readiness: mapReadiness(created.status),
          provider,
          providerDomainId: created.id,
          dnsRecordsJson: serializeDnsRecords(created.records ?? []),
          createdAt: now,
          updatedAt: now,
        })
        .returning(),
    )

    return row!
  })
}

export function removeCustomDomain(domainId: string, organizationId: string) {
  return Effect.gen(function* () {
    const db = yield* Db
    const [row] = yield* operation('domain.remove.select', () =>
      db
        .select()
        .from(customDomain)
        .where(
          and(eq(customDomain.id, domainId), eq(customDomain.organizationId, organizationId)),
        )
        .limit(1),
    )
    if (!row) return false

    const client = yield* DomainClient
    yield* operation('domain.remove.provider', () => client.remove(row.hostname))
    yield* operation('domain.remove.delete', () =>
      db.delete(customDomain).where(eq(customDomain.id, domainId)),
    )
    return true
  })
}
