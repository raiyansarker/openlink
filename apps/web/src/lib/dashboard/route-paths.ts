export const dashboardPaths = {
  root: '/w',
  links: '/w/links',
  analytics: '/w/analytics',
  settings: '/settings',
} as const

export type DashboardPath =
  (typeof dashboardPaths)[keyof typeof dashboardPaths]
