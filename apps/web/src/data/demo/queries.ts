import { demoLinks } from './links'
import { demoMembers } from './members'
import { demoOrganizations } from './organizations'
import { demoStatsByOrg } from './stats'
import type {
  Organization,
  OrgDashboardStats,
  ShortLink,
  WorkspaceMember,
} from './types'
import { withDemoMemberAvatar } from '#/lib/members/demo-avatar'

export function getLinksForOrg(orgId: string): ShortLink[] {
  return demoLinks.filter((link) => link.orgId === orgId)
}

export function getMembersForOrg(orgId: string): WorkspaceMember[] {
  const rows = demoMembers
    .filter((member) => member.orgId === orgId)
    .sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'pending' ? 1 : -1
      }
      return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
    })

  if (rows.length > 0) {
    return rows.map(withDemoMemberAvatar)
  }

  const now = new Date().toISOString()
  return [
    withDemoMemberAvatar({
      id: `mbr_${orgId}_owner`,
      orgId,
      name: 'Raiyan Sarker',
      email: 'developerraiyan@gmail.com',
      role: 'owner',
      status: 'active',
      joinedAt: now,
      lastLoginAt: now,
      lastActiveAt: now,
    }),
  ]
}

const EMPTY_ORG_STATS: OrgDashboardStats = {
  totalLinks: 0,
  activeLinks: 0,
  clicksToday: 0,
  clicksThisWeek: 0,
  uniqueVisitorsWeek: 0,
  topReferrer: '—',
}

export function getStatsForOrg(orgId: string): OrgDashboardStats {
  return demoStatsByOrg[orgId] ?? EMPTY_ORG_STATS
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
