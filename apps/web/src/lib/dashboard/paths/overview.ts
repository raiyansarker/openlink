import { dashboardPaths } from '../route-paths'

export function isDashboardOverviewPath(pathname: string): boolean {
  return pathname === dashboardPaths.root || pathname === `${dashboardPaths.root}/`
}
