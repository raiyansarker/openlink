import { createOpenLinkDomainClient, type DnsRecord } from '@openlink/domain'
import { and, eq } from 'drizzle-orm'
import { customDomain } from '@openlink/db/schema'
import { getBindings } from '../env'
import { getDb } from '../db'

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

export async function refreshCustomDomain(domainId: string) {
  const db = getDb()
  const [row] = await db.select().from(customDomain).where(eq(customDomain.id, domainId)).limit(1)
  if (!row) return null

  const client = createOpenLinkDomainClient(getBindings())
  const remote = await client.refresh(row.hostname)
  const readiness = mapReadiness(remote.status)
  const activeAt = readiness === 'active' ? row.activeAt ?? new Date() : row.activeAt

  const [updated] = await db
    .update(customDomain)
    .set({
      readiness,
      providerDomainId: remote.id ?? row.providerDomainId,
      dnsRecordsJson: serializeDnsRecords(remote.records ?? []),
      activeAt,
      updatedAt: new Date(),
    })
    .where(eq(customDomain.id, domainId))
    .returning()

  return updated ?? null
}

export async function registerCustomDomain(input: {
  organizationId: string
  hostname: string
}) {
  const bindings = getBindings()
  const client = createOpenLinkDomainClient(bindings)
  const created = await client.add(input.hostname)

  const id = crypto.randomUUID()
  const now = new Date()
  const provider = bindings.DOMAIN_PROVIDER === 'cloudflare' ? 'cloudflare' : 'memory'

  const [row] = await getDb()
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
    .returning()

  return row!
}

export async function removeCustomDomain(domainId: string, organizationId: string) {
  const db = getDb()
  const [row] = await db
    .select()
    .from(customDomain)
    .where(
      and(eq(customDomain.id, domainId), eq(customDomain.organizationId, organizationId)),
    )
    .limit(1)
  if (!row) return false

  const client = createOpenLinkDomainClient(getBindings())
  await client.remove(row.hostname)
  await db.delete(customDomain).where(eq(customDomain.id, domainId))
  return true
}
