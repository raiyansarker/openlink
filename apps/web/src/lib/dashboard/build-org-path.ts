export type DashboardSection =
  | 'overview'
  | 'activity'
  | 'notifications'
  | 'links'
  | 'analytics'
  | 'domains'
  | 'reports'
  | 'settings'

const sectionSegment: Record<DashboardSection, string | null> = {
  overview: null,
  activity: 'activity',
  notifications: 'notifications',
  links: 'links',
  analytics: 'analytics',
  domains: 'domains',
  reports: 'reports',
  settings: 'settings',
}

/** Canonical dashboard URL: `/dashboard/{orgSlug}` or nested section. */
export function buildDashboardOrgPath(
  orgSlug: string,
  section: DashboardSection = 'overview',
): string {
  const segment = sectionSegment[section]
  if (!segment) {
    return `/dashboard/${orgSlug}`
  }
  return `/dashboard/${orgSlug}/${segment}`
}

export function dashboardSectionFromPathname(
  pathname: string,
  orgSlug: string,
): DashboardSection {
  const prefix = `/dashboard/${orgSlug}`
  if (pathname === prefix || pathname === `${prefix}/`) {
    return 'overview'
  }
  if (pathname.startsWith(`${prefix}/activity`)) {
    return 'activity'
  }
  if (pathname.startsWith(`${prefix}/notifications`)) {
    return 'notifications'
  }
  if (pathname.startsWith(`${prefix}/links`)) {
    return 'links'
  }
  if (pathname.startsWith(`${prefix}/analytics`)) {
    return 'analytics'
  }
  if (pathname.startsWith(`${prefix}/domains`)) {
    return 'domains'
  }
  if (pathname.startsWith(`${prefix}/reports`)) {
    return 'reports'
  }
  return 'overview'
}

/** Preserve section when switching org from the URL bar. */
export function replaceOrgInPathname(pathname: string, nextOrgSlug: string): string {
  const match = pathname.match(/^\/dashboard\/[^/]+(\/.*)?$/)
  if (!match) {
    return buildDashboardOrgPath(nextOrgSlug)
  }
  const suffix = match[1] ?? ''
  return `/dashboard/${nextOrgSlug}${suffix}`
}
