import { dashboardPaths } from './route-paths'

export type DashboardNavItem = {
  id: string
  label: string
  href: string
  description?: string
  isEnabled?: boolean
}

export const dashboardNavItems: DashboardNavItem[] = [
  {
    id: 'overview',
    label: 'Dashboard',
    href: dashboardPaths.root,
    description: 'Overview and top links',
  },
  {
    id: 'links',
    label: 'Links',
    href: dashboardPaths.links,
    description: 'Manage short URLs',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    href: dashboardPaths.analytics,
    description: 'Traffic and referrers',
  },
  {
    id: 'members',
    label: 'Members',
    href: dashboardPaths.members,
    description: 'Team access',
  },
  {
    id: 'settings',
    label: 'Settings',
    href: dashboardPaths.settings,
    description: 'Org defaults',
  },
]
