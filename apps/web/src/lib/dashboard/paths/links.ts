import { dashboardPaths } from '../route-paths'

export function isDashboardLinksPath(pathname: string): boolean {
  return pathname.startsWith(dashboardPaths.links)
}
