import type { Organization, OrgDashboardStats, ShortLink } from './types'

export const demoOrganizations: Organization[] = [
  {
    id: 'org_openlink',
    name: 'OpenLink Labs',
    slug: 'openlink-labs',
    plan: 'pro',
    memberCount: 8,
  },
  {
    id: 'org_acme',
    name: 'Acme Marketing',
    slug: 'acme-marketing',
    plan: 'enterprise',
    memberCount: 24,
  },
  {
    id: 'org_devrel',
    name: 'DevRel Guild',
    slug: 'devrel-guild',
    plan: 'free',
    memberCount: 3,
  },
]

export const demoLinks: ShortLink[] = [
  {
    id: 'lnk_01',
    orgId: 'org_openlink',
    slug: 'launch',
    title: 'Product launch',
    targetUrl: 'https://openlink.example/docs/launch',
    clicks: 1842,
    uniqueClicks: 1204,
    createdAt: '2026-10-28T14:22:00Z',
    status: 'active',
    tags: ['campaign', 'homepage'],
  },
  {
    id: 'lnk_02',
    orgId: 'org_openlink',
    slug: 'changelog',
    title: 'October changelog',
    targetUrl: 'https://openlink.example/blog/oct-2026',
    clicks: 431,
    uniqueClicks: 318,
    createdAt: '2026-11-01T09:05:00Z',
    status: 'active',
    tags: ['blog'],
  },
  {
    id: 'lnk_03',
    orgId: 'org_openlink',
    slug: 'api-docs',
    title: 'API reference',
    targetUrl: 'https://openlink.example/api',
    clicks: 2901,
    uniqueClicks: 1640,
    createdAt: '2026-08-12T11:00:00Z',
    status: 'active',
    tags: ['docs', 'developers'],
  },
  {
    id: 'lnk_04',
    orgId: 'org_openlink',
    slug: 'old-pricing',
    title: 'Legacy pricing (redirect)',
    targetUrl: 'https://openlink.example/pricing',
    clicks: 88,
    uniqueClicks: 71,
    createdAt: '2025-12-02T16:40:00Z',
    status: 'paused',
    tags: ['legacy'],
  },
  {
    id: 'lnk_05',
    orgId: 'org_acme',
    slug: 'spring-sale',
    title: 'Spring sale landing',
    targetUrl: 'https://acme.example/sale',
    clicks: 9240,
    uniqueClicks: 5102,
    createdAt: '2026-03-15T08:00:00Z',
    status: 'active',
    tags: ['retail', 'paid'],
  },
  {
    id: 'lnk_06',
    orgId: 'org_acme',
    slug: 'careers',
    title: 'Careers page',
    targetUrl: 'https://acme.example/jobs',
    clicks: 612,
    uniqueClicks: 480,
    createdAt: '2026-06-20T10:30:00Z',
    status: 'active',
    tags: ['hr'],
  },
  {
    id: 'lnk_07',
    orgId: 'org_devrel',
    slug: 'meetup',
    title: 'Local meetup RSVP',
    targetUrl: 'https://devrel.example/events/meetup',
    clicks: 156,
    uniqueClicks: 132,
    createdAt: '2026-11-08T18:00:00Z',
    status: 'active',
    tags: ['events'],
  },
  {
    id: 'lnk_08',
    orgId: 'org_devrel',
    slug: 'discord',
    title: 'Community Discord',
    targetUrl: 'https://discord.gg/example',
    clicks: 402,
    uniqueClicks: 389,
    createdAt: '2026-02-14T12:00:00Z',
    status: 'archived',
    tags: ['community'],
  },
]

export const demoStatsByOrg: Record<string, OrgDashboardStats> = {
  org_openlink: {
    totalLinks: 4,
    activeLinks: 3,
    clicksToday: 214,
    clicksThisWeek: 1486,
    uniqueVisitorsWeek: 892,
    topReferrer: 'newsletter',
  },
  org_acme: {
    totalLinks: 2,
    activeLinks: 2,
    clicksToday: 1042,
    clicksThisWeek: 6810,
    uniqueVisitorsWeek: 4201,
    topReferrer: 'instagram',
  },
  org_devrel: {
    totalLinks: 2,
    activeLinks: 1,
    clicksToday: 37,
    clicksThisWeek: 221,
    uniqueVisitorsWeek: 178,
    topReferrer: 'x.com',
  },
}

export function getLinksForOrg(orgId: string): ShortLink[] {
  return demoLinks.filter((link) => link.orgId === orgId)
}

export function getStatsForOrg(orgId: string): OrgDashboardStats {
  return demoStatsByOrg[orgId] ?? demoStatsByOrg.org_openlink
}

export function getOrganization(orgId: string): Organization | undefined {
  return demoOrganizations.find((org) => org.id === orgId)
}

export function shortUrlFor(slug: string, org: Organization): string {
  return `https://${org.slug}.olink/${slug}`
}
