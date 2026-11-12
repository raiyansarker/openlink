import { demoOrganizations } from '#/data/demo/organizations'
import { getOrganizationById } from '#/data/demo/queries'

const STORAGE_KEY = 'openlink.active-org-slug'
const LEGACY_STORAGE_KEY = 'openlink.active-org'

export function getDefaultOrgSlug(): string {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored && demoOrganizations.some((org) => org.slug === stored)) {
      return stored
    }

    const legacyId = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacyId) {
      const org = getOrganizationById(legacyId)
      if (org) {
        window.localStorage.setItem(STORAGE_KEY, org.slug)
        return org.slug
      }
    }
  }
  return demoOrganizations[0].slug
}

export function persistActiveOrgSlug(slug: string): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, slug)
  }
}
