import { createFileRoute } from '@tanstack/react-router'

import { MediaHttp } from '#/server/media/http'
import { MediaUploads } from '#/server/media/uploads'

/** PUT a social preview image (raw image body); returns its URL to save on a link. */
export const Route = createFileRoute('/api/uploads/organizations/$organizationId/link-preview')({
  server: {
    handlers: {
      PUT: ({ request, params }) => MediaHttp.handle(request, MediaUploads.setLinkPreview(params.organizationId), (value) => value),
    },
  },
})
