import { DomainSdkError, normalizeHostname, type DnsRecord } from '@openlink/domain'
import { and, eq } from 'drizzle-orm'
import { Data, Effect } from 'effect'
import { customDomain } from '@openlink/db/schema'
import { operation } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'
import { Bindings } from '#/server/effect/services/bindings'
import { useDomainClient } from '#/server/effect/services/domain-client'

/** The hostname is already connected, to this or another workspace. */
export class DomainTaken extends Data.TaggedError('DomainTaken')<{}> {}

function isUniqueViolation(cause: unknown): boolean {
  const seen = new Set<unknown>()
  while (cause instanceof Error && !seen.has(cause)) {
    seen.add(cause)
    if (/UNIQUE/i.test(cause.message)) return true
    cause = cause.cause
  }
  return false
}

/** The form hostnames are stored in. An invalid one is left as typed; the provider rejects it. */
function storedHostname(hostname: string) {
  try {
    return normalizeHostname(hostname)
  } catch {
    return hostname.trim().toLowerCase()
  }
}

const isProviderConflict = (cause: unknown) => cause instanceof DomainSdkError && cause.code === 'DOMAIN_CONFLICT'

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

export function listDomainsForOrganization(organizationId: string) {
  return Effect.gen(function* () {
    const db = yield* Db
    return yield* operation('domain.list', () =>
      db.select().from(customDomain).where(eq(customDomain.organizationId, organizationId)),
    )
  })
}

export function refreshCustomDomain(domainId: string) {
  return Effect.gen(function* () {
    const db = yield* Db
    const [row] = yield* operation('domain.refresh.select', () =>
      db.select().from(customDomain).where(eq(customDomain.id, domainId)).limit(1),
    )
    if (!row) return null

    // Local (memory) domains have nothing to check, and the in-memory provider
    // forgets them between requests: confirm them instead of asking it.
    if (row.provider === 'memory') {
      const [confirmed] = yield* operation('domain.refresh.update', () =>
        db
          .update(customDomain)
          .set({
            readiness: 'active',
            dnsRecordsJson: JSON.stringify(
              (JSON.parse(row.dnsRecordsJson || '[]') as { status?: string }[]).map((record) => ({ ...record, status: 'verified' })),
            ),
            activeAt: row.activeAt ?? new Date(),
            updatedAt: new Date(),
          })
          .where(eq(customDomain.id, domainId))
          .returning(),
      )
      return confirmed ?? null
    }

    const client = yield* useDomainClient
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
    // Checked before the provider is asked: for a hostname it already has, the provider hands
    // back the existing registration, which belongs to whoever connected it first.
    const [taken] = yield* operation('domain.register.check', () =>
      db.select({ id: customDomain.id }).from(customDomain).where(eq(customDomain.hostname, storedHostname(input.hostname))).limit(1),
    )
    if (taken) return yield* Effect.fail(new DomainTaken())

    const client = yield* useDomainClient
    const created = yield* operation('domain.register.provider', () => client.add(input.hostname)).pipe(
      Effect.catchIf((error) => isProviderConflict(error.cause), () => Effect.fail(new DomainTaken())),
    )

    const id = crypto.randomUUID()
    const now = new Date()
    const provider = bindings.DOMAIN_PROVIDER === 'cloudflare' ? 'cloudflare' : 'memory'

    const readiness = mapReadiness(created.status)

    const [row] = yield* operation('domain.register.insert', () =>
      db
        .insert(customDomain)
        .values({
          id,
          organizationId: input.organizationId,
          hostname: created.hostname,
          readiness,
          // Locally (memory provider) a domain is active the moment it's added.
          activeAt: readiness === 'active' ? now : null,
          provider,
          providerDomainId: created.id,
          dnsRecordsJson: serializeDnsRecords(created.records ?? []),
          createdAt: now,
          updatedAt: now,
        })
        .returning(),
    ).pipe(
      Effect.catchIf(
        (error) => isUniqueViolation(error.cause),
        // Someone connected it between the check and the insert: the provider entry is theirs, so keep it.
        () => Effect.fail(new DomainTaken()),
      ),
      Effect.tapError((error) =>
        error._tag === 'DomainTaken'
          ? Effect.void
          : // We just registered it and could not record it: undo, so the provider and the table agree.
            operation('domain.register.undo', () => client.remove(created.hostname)).pipe(
              Effect.catch((undo) => Effect.logWarning(`domain.register: could not undo ${created.hostname}: ${String(undo.cause)}`)),
            ),
      ),
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

    const client = yield* useDomainClient
    yield* operation('domain.remove.provider', () => client.remove(row.hostname))
    yield* operation('domain.remove.delete', () =>
      db.delete(customDomain).where(eq(customDomain.id, domainId)),
    )
    return true
  })
}
