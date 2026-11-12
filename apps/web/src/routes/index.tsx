import { createFileRoute, redirect } from '@tanstack/react-router'
import { getDefaultOrgId } from '#/lib/dashboard/default-org'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({
      to: '/dashboard/$orgId',
      params: { orgId: getDefaultOrgId() },
    })
  },
})
