import { createFileRoute } from '@tanstack/react-router'

import { MediaHttp } from '#/server/media/http'
import { MediaUploads } from '#/server/media/uploads'

/** PUT a picture (raw image body) or DELETE it, for the signed-in person. */
export const Route = createFileRoute('/api/uploads/avatar')({
  server: {
    handlers: {
      PUT: ({ request }) => MediaHttp.handle(request, MediaUploads.setAvatar, (value) => value),
      DELETE: ({ request }) => MediaHttp.handle(request, MediaUploads.clearAvatar, () => undefined),
    },
  },
})
