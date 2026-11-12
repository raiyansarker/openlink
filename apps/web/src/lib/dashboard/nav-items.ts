import { buildDashboardOrgPath } from './build-org-path'

export type DashboardNavItem = {
  id: string
  label: string
  href: string
  /** Single-key jump hotkey shown in the nav (1–5). */
  hotkey: string
  description?: string
}

export function getDashboardNavItems(orgId: string): DashboardNavItem[] {
  return [
    {
      id: 'overview',
      label: 'Overview',
      href: buildDashboardOrgPath(orgId, 'overview'),
      hotkey: '1',
      description: 'Metrics and top links',
    },
    {
      id: 'links',
      label: 'Links',
      href: buildDashboardOrgPath(orgId, 'links'),
      hotkey: '2',
      description: 'Manage short URLs',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      href: buildDashboardOrgPath(orgId, 'analytics'),
      hotkey: '3',
      description: 'Traffic and referrers',
    },
    {
      id: 'members',
      label: 'Members',
      href: buildDashboardOrgPath(orgId, 'members'),
      hotkey: '4',
      description: 'Team access',
    },
    {
      id: 'settings',
      label: 'Settings',
      href: buildDashboardOrgPath(orgId, 'settings'),
      hotkey: '5',
      description: 'Org defaults',
    },
  ]
}

/** @deprecated Use getDashboardNavItems(orgId) */
export const dashboardNavItems: DashboardNavItem[] = []
