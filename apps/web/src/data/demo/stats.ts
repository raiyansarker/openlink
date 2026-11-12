import type { OrgDashboardStats } from './types'

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
