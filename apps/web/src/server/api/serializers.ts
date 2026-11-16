import { LinkDelivery } from '#/server/links/delivery'
import type {
  activityEvent,
  apiKey,
  customDomain,
  link,
  linkFolder,
  organization,
  organizationInvite,
  organizationMember,
} from '@openlink/db/schema'

import { ACTION_DEFINITIONS, isKnownAction, type Change } from '#/server/activity/actions'
import { MediaKey } from '#/server/media/media-key'
import { deriveLinkStatus } from '#/server/links/rules'

type DeviceSessionRow = {
  id: string
  ipAddress: string | null
  userAgent: string | null
  city: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  signInMethod: string | null
  createdAt: Date
  updatedAt: Date
}

export function toDeviceSessionDto(row: DeviceSessionRow, currentSessionId: string) {
  const optional = <K extends string, V>(key: K, value: V | null) => (value === null ? {} : ({ [key]: value } as Record<K, V>))
  return {
    id: row.id,
    current: row.id === currentSessionId,
    ...optional('ipAddress', row.ipAddress),
    ...optional('userAgent', row.userAgent),
    ...optional('city', row.city),
    ...optional('country', row.country),
    ...optional('latitude', row.latitude),
    ...optional('longitude', row.longitude),
    ...optional('signInMethod', row.signInMethod),
    signedInAt: row.createdAt.toISOString(),
    lastActiveAt: row.updatedAt.toISOString(),
  }
}

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
    ...(row.logoKey ? { logoUrl: MediaKey.toUrl(row.logoKey) } : {}),
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
    folderId: row.folderId,
    ...(row.alias ? { alias: row.alias } : {}),
    ...(row.title ? { title: row.title } : {}),
    ...(row.description ? { description: row.description } : {}),
    destinationUrl: row.destinationUrl,
    redirectStatus: row.redirectStatus as RedirectCode,
    // Derived, so a link past its expiry or click limit reports `expired` rather than its stored status.
    status: deriveLinkStatus(row),
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
    ...LinkDelivery.fromJson(row.deliveryJson).toDto(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function toFolderDto(row: typeof linkFolder.$inferSelect) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    parentId: row.parentId,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
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

export function toWorkspaceMemberDto(row: {
  userId: string
  name: string
  email: string
  image: string | null
  role: typeof organizationMember.$inferSelect.role
  joinedAt: Date
}) {
  return {
    userId: row.userId,
    name: row.name,
    email: row.email,
    ...(row.image ? { image: row.image } : {}),
    role: row.role,
    joinedAt: row.joinedAt.toISOString(),
  }
}

export function toPendingInviteDto(row: typeof organizationInvite.$inferSelect) {
  return {
    id: row.id,
    organizationId: row.organizationId!,
    email: row.email,
    role: row.role,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  }
}

/** An invite as its recipient sees it in their inbox. */
export function toMyInviteDto(row: {
  id: string
  role: 'admin' | 'member' | 'viewer'
  expiresAt: Date
  createdAt: Date
  organizationId: string
  organizationName: string
  organizationSlug: string
  organizationLogoKey: string | null
  invitedByName: string | null
  invitedByImage: string | null
}) {
  return {
    id: row.id,
    role: row.role,
    invitedAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    organization: {
      id: row.organizationId,
      name: row.organizationName,
      slug: row.organizationSlug,
      ...(row.organizationLogoKey ? { logoUrl: MediaKey.toUrl(row.organizationLogoKey) } : {}),
    },
    ...(row.invitedByName
      ? { invitedBy: { name: row.invitedByName, ...(row.invitedByImage ? { imageUrl: row.invitedByImage } : {}) } }
      : {}),
  }
}

function parseChanges(json: string | null): Change[] | undefined {
  if (!json) return undefined
  try {
    const parsed = JSON.parse(json) as { changes?: Change[] }
    return parsed.changes && parsed.changes.length > 0 ? parsed.changes : undefined
  } catch {
    return undefined
  }
}

/** `includeIp` is for administrators only. */
export function toActivityDto(
  row: typeof activityEvent.$inferSelect & { actorImage?: string | null },
  options: { includeIp: boolean },
) {
  const changes = parseChanges(row.detailsJson)
  return {
    id: row.id,
    organizationId: row.organizationId,
    action: row.action,
    phrase: isKnownAction(row.action) ? ACTION_DEFINITIONS[row.action].phrase : row.action,
    category: row.category,
    source: row.source,
    actor: {
      type: row.actorType,
      label: row.actorLabel,
      ...(row.actorUserId ? { userId: row.actorUserId } : {}),
      ...(row.actorImage ? { imageUrl: row.actorImage } : {}),
    },
    target: { type: row.targetType, ...(row.targetId ? { id: row.targetId } : {}), label: row.targetLabel },
    ...(changes ? { changes } : {}),
    ...(options.includeIp && row.ipAddress ? { ipAddress: row.ipAddress } : {}),
    occurredAt: row.createdAt.toISOString(),
  }
}

export function toApiKeyDto(row: typeof apiKey.$inferSelect) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    prefix: row.prefix,
    role: row.role,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
  }
}
