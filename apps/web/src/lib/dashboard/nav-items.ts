import { WorkspaceUrl } from './build-org-path'
import type { DashboardSection } from './build-org-path'

export type DashboardNavItem = {
  id: DashboardSection
  label: string
  href: string
  description?: string
}

export type DashboardNavGroup = {
  id: string
  label: string
  items: DashboardNavItem[]
}

export function getDashboardNavGroups(orgSlug: string): DashboardNavGroup[] {
  const path = (section: DashboardSection) => WorkspaceUrl.build(orgSlug, section)

  return [
    {
      id: 'overview',
      label: 'Overview',
      items: [
        {
          id: 'overview',
          label: 'Dashboard',
          href: path('overview'),
          description: 'Summary and activity',
        },
        {
          id: 'activity',
          label: 'Activity',
          href: path('activity'),
          description: 'Recent events',
        },
        {
          id: 'notifications',
          label: 'Notifications',
          href: path('notifications'),
          description: 'Alerts and mentions',
        },
      ],
    },
    {
      id: 'workspace',
      label: 'Workspace',
      items: [
        {
          id: 'links',
          label: 'Links',
          href: path('links'),
          description: 'Short URLs and destinations',
        },
        {
          id: 'domains',
          label: 'Domains',
          href: path('domains'),
          description: 'Custom domains',
        },
      ],
    },
    {
      id: 'insights',
      label: 'Insights',
      items: [
        {
          id: 'analytics',
          label: 'Analytics',
          href: path('analytics'),
          description: 'Traffic and trends',
        },
      ],
    },
  ]
}

/** @deprecated Use getDashboardNavGroups */
export const dashboardNavItems: DashboardNavItem[] = []
