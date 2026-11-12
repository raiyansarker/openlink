import type {
  customDomain,
  link,
  organization,
  organizationMember,
} from '@openlink/db/schema'

export function toUserDto(user: { id: string; email: string; name: string; createdAt: Date }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
  }
}

export function toOrganizationDto(row: typeof organization.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.createdAt.toISOString(),
  }
}

type DnsRecordDto = {
  type: string
  host: string
  value: string
  purpose: 'routing' | 'ownership' | 'certificate'
  status?: 'required' | 'verified' | 'failed'
}

type RedirectCode = 301 | 302 | 307 | 308

export function toDomainDto(row: typeof customDomain.$inferSelect) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    hostname: row.hostname,
    readiness: row.readiness,
    dnsRecords: JSON.parse(row.dnsRecordsJson) as DnsRecordDto[],
    defaultRedirectStatus: row.defaultRedirectStatus as RedirectCode,
    createdAt: row.createdAt.toISOString(),
    ...(row.activeAt ? { activeAt: row.activeAt.toISOString() } : {}),
  }
}

export function toLinkDto(row: typeof link.$inferSelect) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    domainId: row.domainId,
    slug: row.slug,
    ...(row.alias ? { alias: row.alias } : {}),
    ...(row.title ? { title: row.title } : {}),
    ...(row.description ? { description: row.description } : {}),
    destinationUrl: row.destinationUrl,
    redirectStatus: row.redirectStatus as RedirectCode,
    status: row.status,
    enabled: row.enabled,
    ...(row.activateAt ? { activateAt: row.activateAt.toISOString() } : {}),
    ...(row.expiresAt ? { expiresAt: row.expiresAt.toISOString() } : {}),
    ...(row.maxClicks != null ? { maxClicks: row.maxClicks } : {}),
    clickCount: row.clickCount,
    passwordProtected: Boolean(row.passwordHash),
    ...(row.expiredDestinationUrl
      ? { expiredDestinationUrl: row.expiredDestinationUrl }
      : {}),
    ...(row.fallbackDestinationUrl
      ? { fallbackDestinationUrl: row.fallbackDestinationUrl }
      : {}),
    tags: JSON.parse(row.tagsJson) as string[],
    ...(row.utmJson ? { utm: JSON.parse(row.utmJson) } : {}),
    ...(row.metadataJson ? { metadata: JSON.parse(row.metadataJson) } : {}),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function toMembershipDto(
  org: typeof organization.$inferSelect,
  member: typeof organizationMember.$inferSelect,
) {
  return {
    organization: toOrganizationDto(org),
    role: member.role,
    joinedAt: member.joinedAt.toISOString(),
  }
}
