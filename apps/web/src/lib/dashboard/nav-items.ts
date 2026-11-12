import { buildDashboardOrgPath } from './build-org-path'

export type DashboardNavItem = {
  id: string
  label: string
  href: string
  description?: string
}

export function getDashboardNavItems(orgId: string): DashboardNavItem[] {
  return [
    {
      id: 'overview',
      label: 'Dashboard',
      href: buildDashboardOrgPath(orgId, 'overview'),
      description: 'Overview and top links',
    },
    {
      id: 'links',
      label: 'Links',
      href: buildDashboardOrgPath(orgId, 'links'),
      description: 'Manage short URLs',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      href: buildDashboardOrgPath(orgId, 'analytics'),
      description: 'Traffic and referrers',
    },
    {
      id: 'members',
      label: 'Members',
      href: buildDashboardOrgPath(orgId, 'members'),
      description: 'Team access',
    },
    {
      id: 'settings',
      label: 'Settings',
      href: buildDashboardOrgPath(orgId, 'settings'),
      description: 'Org defaults',
    },
  ]
}

/** @deprecated Use getDashboardNavItems(orgId) */
export const dashboardNavItems: DashboardNavItem[] = []
