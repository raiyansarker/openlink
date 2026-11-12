import { dashboardPaths } from '../route-paths'

export function isDashboardSettingsPath(pathname: string): boolean {
  return pathname.startsWith(dashboardPaths.settings)
}
