import type { OrgDashboardStats } from './types'

export const demoStatsByOrg: Record<string, OrgDashboardStats> = {
  org_x: {
    totalLinks: 7,
    activeLinks: 6,
    clicksToday: 3842,
    clicksThisWeek: 24610,
    uniqueVisitorsWeek: 18940,
    topReferrer: 'x.com',
  },
  org_github: {
    totalLinks: 5,
    activeLinks: 4,
    clicksToday: 921,
    clicksThisWeek: 6240,
    uniqueVisitorsWeek: 4810,
    topReferrer: 'google.com',
  },
  org_dribbble: {
    totalLinks: 3,
    activeLinks: 3,
    clicksToday: 412,
    clicksThisWeek: 2890,
    uniqueVisitorsWeek: 2104,
    topReferrer: 'instagram.com',
  },
}
