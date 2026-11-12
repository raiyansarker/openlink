import { dashboardPaths } from '../route-paths'

export function isDashboardSettingsPath(pathname: string): boolean {
  return pathname === dashboardPaths.settings || pathname.startsWith(`${dashboardPaths.settings}/`)
}
