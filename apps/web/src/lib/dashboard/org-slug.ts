import { demoOrganizations } from '#/data/demo/organizations'

const STORAGE_KEY = 'openlink.active-org-slug'

export function getDefaultOrgSlug(): string {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored && demoOrganizations.some((org) => org.slug === stored)) {
      return stored
    }
  }
  return demoOrganizations[0].slug
}

export function persistActiveOrgSlug(slug: string): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, slug)
  }
}
