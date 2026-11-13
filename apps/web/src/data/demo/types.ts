export type OrganizationPlan = 'free' | 'pro' | 'enterprise'

export type Organization = {
  id: string
  name: string
  slug: string
  plan: OrganizationPlan
  memberCount: number
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
  /** Oldest first, like a conversation. */
  comments?: LinkComment[]
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
    /** Someone left a comment (the comment itself lives in `comments`). */
    | 'commented'
  /** Human summary, e.g. "Moved to Docs / Guides". */
  summary: string
  changes?: LinkHistoryChange[]
  /** Short quote shown under the summary (e.g. a comment excerpt). */
  excerpt?: string
  /** For `commented` events: the comment, so edits and deletes stay in sync. */
  commentId?: string
}

/** A note left on a link by a teammate. */
export type LinkComment = {
  id: string
  at: string
  authorId: string
  authorName: string
  authorAvatarUrl?: string
  body: string
  editedAt?: string
  /** Emoji → ids of the people who reacted with it. */
  reactions?: Record<string, string[]>
}

/** Placeholder pages Hold mode can show. */
export type HoldPage =
  | 'bad-gateway'
  | 'service-unavailable'
  | 'gateway-timeout'
  | 'maintenance'

export type LinkHold = {
  page: HoldPage
  /** ISO time the hold lifts automatically; absent = until released by hand. */
  releaseAt?: string
}

export type GeoTargetRule = {
  /** ISO 3166-1 alpha-2 code, e.g. "US". */
  country: string
  url: string
}

/** Device rules are checked before country rules. */
export type LinkTargeting = {
  ios?: string
  android?: string
  geo?: GeoTargetRule[]
}

export type SocialPreview = {
  title?: string
  description?: string
  imageUrl?: string
}

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
