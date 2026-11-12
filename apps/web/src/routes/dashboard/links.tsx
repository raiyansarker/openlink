import { createFileRoute, redirect } from '@tanstack/react-router'
import { getDefaultOrgId } from '#/lib/dashboard/default-org'

/** Legacy path — forwards to org-scoped dashboard URL. */
export const Route = createFileRoute('/dashboard/links')({
  beforeLoad: () => {
    throw redirect({
      to: '/dashboard/$orgId/links',
      params: { orgId: getDefaultOrgId() },
    })
  },
})
