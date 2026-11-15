import { createFileRoute, notFound, redirect } from '@tanstack/react-router'

import { WorkspaceUrl } from '#/lib/dashboard/build-org-path'

/** `/dashboard/{workspace}/…` moved to `/w/{workspace}/…`; query and hash are kept. */
export const Route = createFileRoute('/dashboard/$')({
  beforeLoad: ({ location }) => {
    const target = WorkspaceUrl.fromLegacy(location.href)
    if (!target) throw notFound()
    throw redirect({ href: target, replace: true })
  },
})
