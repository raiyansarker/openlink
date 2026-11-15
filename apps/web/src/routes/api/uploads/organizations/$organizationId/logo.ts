import { createFileRoute } from '@tanstack/react-router'

import { MediaHttp } from '#/server/media/http'
import { MediaUploads } from '#/server/media/uploads'

/** PUT a workspace logo (raw image body) or DELETE it; owners and admins only. */
export const Route = createFileRoute('/api/uploads/organizations/$organizationId/logo')({
  server: {
    handlers: {
      PUT: ({ request, params }) => MediaHttp.handle(request, MediaUploads.setLogo(params.organizationId), (value) => value),
      DELETE: ({ request, params }) => MediaHttp.handle(request, MediaUploads.clearLogo(params.organizationId), () => undefined),
    },
  },
})
