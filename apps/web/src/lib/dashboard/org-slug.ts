import type { Organization } from '#/data/demo/types'
import { isValidOrganizationSlug } from '#/lib/organization/slugify'

/** Which workspace the user is looking at, remembered between visits. */
export class ActiveWorkspace {
  static readonly STORAGE_KEY = 'openlink.active-org-slug'

  /** The slug saved by a previous visit, if it is well-formed. */
  static remembered(): string | null {
    if (typeof window === 'undefined') return null
    const stored = window.localStorage.getItem(ActiveWorkspace.STORAGE_KEY)
    return stored && isValidOrganizationSlug(stored) ? stored : null
  }

  static remember(slug: string): void {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ActiveWorkspace.STORAGE_KEY, slug)
    }
  }

  /**
   * An explicit slug must match a workspace the user belongs to (never silently
   * substituting another). Without one: the remembered workspace, else the first.
   */
  static pick(organizations: Organization[], slug?: string | null): Organization | null {
    if (slug) return organizations.find((org) => org.slug === slug) ?? null
    const remembered = ActiveWorkspace.remembered()
    return organizations.find((org) => org.slug === remembered) ?? organizations[0] ?? null
  }
}
