import { demoLinks } from './links'
import { demoOrganizations } from './organizations'
import { demoStatsByOrg } from './stats'
import type { Organization, OrgDashboardStats, ShortLink } from './types'

export function getLinksForOrg(orgId: string): ShortLink[] {
  return demoLinks.filter((link) => link.orgId === orgId)
}

export function getStatsForOrg(orgId: string): OrgDashboardStats {
  return demoStatsByOrg[orgId] ?? demoStatsByOrg.org_openlink
}

export function getOrganization(orgId: string): Organization | undefined {
  return demoOrganizations.find((org) => org.id === orgId)
}

export function getOrganizationById(orgId: string): Organization | undefined {
  return getOrganization(orgId)
}

export function getOrganizationBySlug(slug: string): Organization | undefined {
  return demoOrganizations.find((org) => org.slug === slug)
}

export function isValidOrgId(orgId: string): boolean {
  return demoOrganizations.some((org) => org.id === orgId)
}

export function isValidOrgSlug(orgSlug: string): boolean {
  return demoOrganizations.some((org) => org.slug === orgSlug)
}
