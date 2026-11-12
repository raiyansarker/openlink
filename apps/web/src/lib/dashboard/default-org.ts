import { demoOrganizations } from '#/data/demo/organizations'

const STORAGE_KEY = 'openlink.active-org'

export function getDefaultOrgId(): string {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored && demoOrganizations.some((org) => org.id === stored)) {
      return stored
    }
  }
  return demoOrganizations[0].id
}
