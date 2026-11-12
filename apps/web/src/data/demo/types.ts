export type OrganizationPlan = 'free' | 'pro' | 'enterprise'

export type Organization = {
  id: string
  name: string
  slug: string
  plan: OrganizationPlan
  memberCount: number
}

export type ShortLinkStatus = 'active' | 'paused' | 'archived'

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
}

export type OrgDashboardStats = {
  totalLinks: number
  activeLinks: number
  clicksToday: number
  clicksThisWeek: number
  uniqueVisitorsWeek: number
  topReferrer: string
}
