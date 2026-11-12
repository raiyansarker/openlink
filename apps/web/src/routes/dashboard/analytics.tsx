import { createFileRoute, redirect } from '@tanstack/react-router'
import { getDefaultOrgId } from '#/lib/dashboard/default-org'

export const Route = createFileRoute('/dashboard/analytics')({
  beforeLoad: () => {
    throw redirect({
      to: '/dashboard/$orgId/analytics',
      params: { orgId: getDefaultOrgId() },
    })
  },
})
