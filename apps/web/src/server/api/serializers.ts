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

import { parseReactions } from '#/server/comments/rules'
import type { CommentRow } from '#/server/comments/service'
import { ACTION_DEFINITIONS, isKnownAction, type Change } from '#/server/activity/actions'
import { deriveLinkStatus } from '#/server/links/rules'

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
export function toActivityDto(row: typeof activityEvent.$inferSelect, options: { includeIp: boolean }) {
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
    },
    target: { type: row.targetType, ...(row.targetId ? { id: row.targetId } : {}), label: row.targetLabel },
    ...(changes ? { changes } : {}),
    ...(options.includeIp && row.ipAddress ? { ipAddress: row.ipAddress } : {}),
    occurredAt: row.createdAt.toISOString(),
  }
}

export function toCommentDto(row: CommentRow) {
  return {
    id: row.id,
    linkId: row.linkId,
    authorId: row.authorUserId,
    authorName: row.authorLabel,
    ...(row.authorImage ? { authorImage: row.authorImage } : {}),
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    ...(row.editedAt ? { editedAt: row.editedAt.toISOString() } : {}),
    reactions: parseReactions(row.reactionsJson),
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
