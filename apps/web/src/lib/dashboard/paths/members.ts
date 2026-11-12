import { dashboardPaths } from '../route-paths'

export function isDashboardMembersPath(pathname: string): boolean {
  return pathname.startsWith(dashboardPaths.members)
}
