import { createFileRoute } from '@tanstack/react-router'
import { Effect } from 'effect'

import { effectRuntime } from '#/server/effect/runtime'
import { MediaUploads } from '#/server/media/uploads'

const serve = ({ params }: { params: { _splat?: string } }) =>
  effectRuntime.runPromise(
    MediaUploads.serve(params._splat ?? '').pipe(
      Effect.catchCause((cause) =>
        Effect.logError('media.serve_failed', cause).pipe(
          Effect.as(new Response('Unavailable', { status: 503, headers: { 'cache-control': 'no-store' } })),
        ),
      ),
      Effect.annotateLogs({ key: params._splat ?? '' }),
    ),
  )

/** Public, cacheable profile pictures and workspace logos. */
export const Route = createFileRoute('/api/media/$')({
  server: { handlers: { GET: serve } },
})
