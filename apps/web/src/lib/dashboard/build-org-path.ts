export type DashboardSection =
  | 'overview'
  | 'activity'
  | 'links'
  | 'analytics'
  | 'domains'
  | 'settings'

const sectionSegment: Record<DashboardSection, string | null> = {
  overview: null,
  activity: 'activity',
  links: 'links',
  analytics: 'analytics',
  domains: 'domains',
  settings: 'settings',
}

/** Where a workspace lives in the URL: `/w/{orgSlug}` and nested sections. */
export class WorkspaceUrl {
  static readonly PREFIX = '/w'
  /** The pre-`/w` prefix; old bookmarks still resolve through a redirect. */
  static readonly LEGACY_PREFIX = '/dashboard'

  /** `/w/{orgSlug}` or `/w/{orgSlug}/{section}`. */
  static build(orgSlug: string, section: DashboardSection = 'overview'): string {
    const segment = sectionSegment[section]
    const base = `${WorkspaceUrl.PREFIX}/${orgSlug}`
    return segment ? `${base}/${segment}` : base
  }

  /** Which section a pathname inside workspace `orgSlug` belongs to. */
  static sectionOf(pathname: string, orgSlug: string): DashboardSection {
    const prefix = WorkspaceUrl.build(orgSlug)
    if (pathname === prefix || pathname === `${prefix}/`) return 'overview'
    for (const section of Object.keys(sectionSegment) as DashboardSection[]) {
      const segment = sectionSegment[section]
      if (segment && section !== 'settings' && pathname.startsWith(`${prefix}/${segment}`)) return section
    }
    return 'overview'
  }

  /** Keep the current section when switching to another workspace. */
  static replaceOrg(pathname: string, nextOrgSlug: string): string {
    const match = pathname.match(/^\/w\/[^/]+(\/.*)?$/)
    if (!match) return WorkspaceUrl.build(nextOrgSlug)
    return `${WorkspaceUrl.PREFIX}/${nextOrgSlug}${match[1] ?? ''}`
  }

  /**
   * Old pre-workspace URLs that had no workspace in them. They now resolve the
   * workspace first: `/w?section=…`, or the settings page, which never lived under one.
   */
  private static readonly LEGACY_SECTION_TARGETS: Record<string, string> = {
    links: `/w?section=links`,
    analytics: `/w?section=analytics`,
    settings: '/settings/profile',
  }

  /**
   * The current equivalent of an old `/dashboard` URL, or null if `href` is not
   * under the old prefix. Workspace URLs keep their query and hash.
   */
  static fromLegacy(href: string): string | null {
    const legacy = WorkspaceUrl.LEGACY_PREFIX
    if (!href.startsWith(legacy)) return null
    const rest = href.slice(legacy.length)
    // Only a whole path segment counts: `/dashboardx` is not `/dashboard`.
    if (rest !== '' && !/^[/?#]/.test(rest)) return null
    const bare = rest.split(/[?#]/, 1)[0]!.replace(/\/$/, '').slice(1)
    const section = WorkspaceUrl.LEGACY_SECTION_TARGETS[bare]
    if (section) return section
    // `/dashboard/` and `/dashboard/?x` both become `/w` and `/w?x`.
    const tail = /^\/(?=$|[?#])/.test(rest) ? rest.slice(1) : rest
    return `${WorkspaceUrl.PREFIX}${tail}`
  }
}
