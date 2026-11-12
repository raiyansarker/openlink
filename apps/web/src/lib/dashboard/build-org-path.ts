export type DashboardSection =
  | 'overview'
  | 'links'
  | 'analytics'
  | 'members'
  | 'settings'

const sectionSegment: Record<DashboardSection, string | null> = {
  overview: null,
  links: 'links',
  analytics: 'analytics',
  members: 'members',
  settings: 'settings',
}

/** Canonical dashboard URL: `/dashboard/{orgId}` or nested section. */
export function buildDashboardOrgPath(
  orgId: string,
  section: DashboardSection = 'overview',
): string {
  const segment = sectionSegment[section]
  if (!segment) {
    return `/dashboard/${orgId}`
  }
  return `/dashboard/${orgId}/${segment}`
}

export function dashboardSectionFromPathname(
  pathname: string,
  orgId: string,
): DashboardSection {
  const prefix = `/dashboard/${orgId}`
  if (pathname === prefix || pathname === `${prefix}/`) {
    return 'overview'
  }
  if (pathname.startsWith(`${prefix}/links`)) {
    return 'links'
  }
  if (pathname.startsWith(`${prefix}/analytics`)) {
    return 'analytics'
  }
  if (pathname.startsWith(`${prefix}/members`)) {
    return 'members'
  }
  if (pathname.startsWith(`${prefix}/settings`)) {
    return 'settings'
  }
  return 'overview'
}

/** Preserve section when switching org from the URL bar. */
export function replaceOrgInPathname(pathname: string, nextOrgId: string): string {
  const match = pathname.match(/^\/dashboard\/[^/]+(\/.*)?$/)
  if (!match) {
    return buildDashboardOrgPath(nextOrgId)
  }
  const suffix = match[1] ?? ''
  return `/dashboard/${nextOrgId}${suffix}`
}
