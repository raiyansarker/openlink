export const dashboardPaths = {
  root: '/dashboard',
  links: '/dashboard/links',
  analytics: '/dashboard/analytics',
  settings: '/settings',
} as const

export type DashboardPath =
  (typeof dashboardPaths)[keyof typeof dashboardPaths]
