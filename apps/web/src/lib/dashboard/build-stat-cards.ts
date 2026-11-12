import type { OrgDashboardStats } from '#/data/demo/types'
import { formatCompactNumber } from '#/lib/format/compact-number'

export type DashboardStatCardModel = {
  label: string
  value: number | string
  detail: string
}

export function buildDashboardStatCards(
  stats: OrgDashboardStats,
): DashboardStatCardModel[] {
  return [
    {
      label: 'Total links',
      value: stats.totalLinks,
      detail: `${stats.activeLinks} active`,
    },
    {
      label: 'Clicks today',
      value: stats.clicksToday,
      detail: 'Across all short links',
    },
    {
      label: 'Clicks this week',
      value: stats.clicksThisWeek,
      detail: `${formatCompactNumber(stats.uniqueVisitorsWeek)} unique visitors`,
    },
    {
      label: 'Top referrer',
      value: stats.topReferrer,
      detail: 'Last 7 days',
    },
  ]
}
