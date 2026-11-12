import { createFileRoute, redirect } from '@tanstack/react-router'
import { getDefaultOrgSlug } from '#/lib/dashboard/org-slug'

export const Route = createFileRoute('/dashboard/analytics')({
  beforeLoad: () => {
    throw redirect({
      to: '/dashboard/$orgSlug/analytics',
      params: { orgSlug: getDefaultOrgSlug() },
    })
  },
})
