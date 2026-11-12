import { createFileRoute, redirect } from '@tanstack/react-router'
import { getDefaultOrgSlug } from '#/lib/dashboard/org-slug'

export const Route = createFileRoute('/dashboard/members')({
  beforeLoad: () => {
    throw redirect({
      to: '/dashboard/$orgSlug/members',
      params: { orgSlug: getDefaultOrgSlug() },
    })
  },
})
