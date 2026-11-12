import { dashboardPaths } from '../route-paths'

export function isDashboardAnalyticsPath(pathname: string): boolean {
  return pathname.startsWith(dashboardPaths.analytics)
}
