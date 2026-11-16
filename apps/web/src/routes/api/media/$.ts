import { createFileRoute } from '@tanstack/react-router'
import { Effect } from 'effect'

import { effectRuntime } from '#/server/effect/runtime'
import { MediaUploads } from '#/server/media/uploads'

const serve = ({ params }: { params: { _splat?: string } }) =>
  effectRuntime.runPromise(
    MediaUploads.serve(params._splat ?? '').pipe(
      Effect.catch(() => Effect.succeed(new Response('Unavailable', { status: 503, headers: { 'cache-control': 'no-store' } }))),
    ),
  )

/** Public, cacheable profile pictures and workspace logos. */
export const Route = createFileRoute('/api/media/$')({
  server: { handlers: { GET: serve } },
})
