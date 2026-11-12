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
