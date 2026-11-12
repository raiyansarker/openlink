import { createFileRoute, redirect } from '@tanstack/react-router'
import { getDefaultOrgId } from '#/lib/dashboard/default-org'

export const Route = createFileRoute('/dashboard/settings')({
  beforeLoad: () => {
    throw redirect({
      to: '/dashboard/$orgId/settings',
      params: { orgId: getDefaultOrgId() },
    })
  },
})
