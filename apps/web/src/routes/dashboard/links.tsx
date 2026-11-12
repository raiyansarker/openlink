import { createFileRoute, redirect } from '@tanstack/react-router'
import { getDefaultOrgSlug } from '#/lib/dashboard/org-slug'

/** Legacy path — forwards to org-scoped dashboard URL. */
export const Route = createFileRoute('/dashboard/links')({
  beforeLoad: () => {
    throw redirect({
      to: '/dashboard/$orgSlug/links',
      params: { orgSlug: getDefaultOrgSlug() },
    })
  },
})
