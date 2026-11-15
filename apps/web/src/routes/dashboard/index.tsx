import { createFileRoute, redirect } from '@tanstack/react-router'

import { WorkspaceUrl } from '#/lib/dashboard/build-org-path'

/** The old dashboard URL; kept so existing bookmarks keep working. */
export const Route = createFileRoute('/dashboard/')({
  beforeLoad: () => {
    throw redirect({ href: WorkspaceUrl.PREFIX, replace: true })
  },
})
