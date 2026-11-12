import { createFileRoute, redirect } from '@tanstack/react-router'
import { getDefaultOrgSlug } from '#/lib/dashboard/org-slug'

export const Route = createFileRoute('/dashboard/settings')({
  beforeLoad: () => {
    throw redirect({
      to: '/dashboard/$orgSlug/settings',
      params: { orgSlug: getDefaultOrgSlug() },
    })
  },
})
