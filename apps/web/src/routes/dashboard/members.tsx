import { createFileRoute, redirect } from '@tanstack/react-router'
import { getDefaultOrgId } from '#/lib/dashboard/default-org'

export const Route = createFileRoute('/dashboard/members')({
  beforeLoad: () => {
    throw redirect({
      to: '/dashboard/$orgId/members',
      params: { orgId: getDefaultOrgId() },
    })
  },
})
