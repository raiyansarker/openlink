import type { HoldPageId, LinkHold, LinkTargeting, SocialPreview } from '@openlink/contracts'
export type OrganizationPlan = 'free' | 'pro' | 'enterprise'

export type Organization = {
  id: string
  name: string
  slug: string
  plan: OrganizationPlan
  /** Unknown until members are loaded; the API has no cheap count. */
  memberCount?: number
  /** Uploaded logo URL, if the workspace has one. */
  logoUrl?: string
  /** The signed-in user's role in this workspace (absent for demo data). */
  role?: WorkspaceMemberRole
}

export type ShortLinkStatus = 'active' | 'scheduled' | 'paused' | 'archived'

/** HTTP status used for the redirect (mirrors the API contract). */
export type RedirectStatusCode = 301 | 302 | 307 | 308

export type UtmParameters = {
  source?: string
  medium?: string
  campaign?: string
  term?: string
  content?: string
}

export type ShortLink = {
  id: string
  orgId: string
  slug: string
  title: string
  targetUrl: string
  clicks: number
  uniqueClicks: number
  createdAt: string
  status: ShortLinkStatus
  tags: string[]
  /** Containing folder; null/undefined means the org root. */
  folderId?: string | null
  /** Custom domain id; null/undefined means the org's default short host. */
  domainId?: string | null
  description?: string
  redirectStatus?: RedirectStatusCode
  /** ISO timestamps. */
  activateAt?: string
  expiresAt?: string
  maxClicks?: number
  /** Demo only: the password itself is never stored, just whether one is set. */
  passwordProtected?: boolean
  expiredDestinationUrl?: string
  fallbackDestinationUrl?: string
  utm?: UtmParameters
  metadata?: Record<string, string>
  /**
   * Link cloaking: the destination loads inside a frame so the address bar
   * keeps showing the short URL (no HTTP redirect is sent).
   */
  cloaked?: boolean
  /** Custom social card (Open Graph / Twitter) shown when the link is shared. */
  socialPreview?: SocialPreview
  /** Per-device / per-country destinations; everyone else gets `targetUrl`. */
  targeting?: LinkTargeting
  /** Hold mode: serve a placeholder error page instead of redirecting. */
  hold?: LinkHold
  /** Destination as entered, before UTM parameters are applied. */
  destinationUrl?: string
  updatedAt?: string
  /** Latest destination health check (run by the backend). */
  health?: LinkHealth
  /** Newest first. */
  history?: LinkHistoryEvent[]
}

export type LinkHealthStatus = 'healthy' | 'redirects' | 'slow' | 'broken'

export type LinkHealth = {
  status: LinkHealthStatus
  /** HTTP status of the final response. */
  statusCode: number
  responseMs: number
  checkedAt: string
  /** Where the destination ended up after its own redirects, if elsewhere. */
  finalUrl?: string
}

export type LinkHistoryChange = {
  label: string
  from: string
  to: string
}

export type LinkHistoryEvent = {
  id: string
  at: string
  actor: string
  /** The actor's profile picture, when they have one. */
  actorImageUrl?: string
  type:
    | 'created'
    | 'updated'
    | 'held'
    | 'released'
    | 'moved'
    | 'duplicated'
    | 'tagged'
    /** A destination health check ran. */
    | 'checked'
  /** Human summary, e.g. "Moved to Docs / Guides". */
  summary: string
  changes?: LinkHistoryChange[]
}

/** Delivery settings share the API's types so the editor cannot drift from what the server accepts. */
export type { LinkHold, LinkTargeting, SocialPreview }
export type HoldPage = HoldPageId
export type GeoTargetRule = NonNullable<LinkTargeting['geo']>[number]

/** Org-scoped folder. Folders nest recursively via `parentId` (null = root). */
export type LinkFolder = {
  id: string
  orgId: string
  parentId: string | null
  name: string
  createdAt: string
}

export type OrgDashboardStats = {
  totalLinks: number
  activeLinks: number
  clicksToday: number
  clicksThisWeek: number
  uniqueVisitorsWeek: number
  topReferrer: string
}

export type WorkspaceMemberRole = 'owner' | 'admin' | 'member' | 'viewer'

export type WorkspaceMemberStatus = 'active' | 'pending'

export type WorkspaceMember = {
  id: string
  orgId: string
  name: string
  email: string
  role: WorkspaceMemberRole
  status: WorkspaceMemberStatus
  joinedAt: string
  lastLoginAt?: string
  lastActiveAt?: string
  avatarUrl?: string
}

export type MemberActivityEvent = {
  id: string
  memberId: string
  title: string
  description?: string
  occurredAt: string
}
