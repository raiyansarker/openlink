import { Data, Effect } from 'effect'

import { operation } from '../effect/operations'
import { Bindings } from '../effect/services/bindings'
import type { ImageMime } from './image-format'

export class MediaNotFound extends Data.TaggedError('MediaNotFound')<{}> {}

/** Uploaded images in the `MEDIA` R2 bucket. */
export class MediaStore {
  private static readonly bucket = Effect.gen(function* () {
    const { MEDIA } = yield* Bindings
    if (!MEDIA) return yield* operation('media.bucket', () => Promise.reject(new Error('MEDIA bucket is not bound')))
    return MEDIA
  })

  static put(key: string, bytes: Uint8Array, mime: ImageMime) {
    return Effect.gen(function* () {
      const bucket = yield* MediaStore.bucket
      yield* operation('media.put', () => bucket.put(key, bytes, { httpMetadata: { contentType: mime } }))
    })
  }

  static get(key: string) {
    return Effect.gen(function* () {
      const bucket = yield* MediaStore.bucket
      const object = yield* operation('media.get', () => bucket.get(key))
      if (!object) return yield* Effect.fail(new MediaNotFound())
      return object
    })
  }

  /** Cleanup must never fail the action that triggered it; a leftover object is only wasted space. */
  static removeQuietly(key: string | null | undefined) {
    if (!key) return Effect.void
    return Effect.gen(function* () {
      const bucket = yield* MediaStore.bucket
      yield* operation('media.delete', () => bucket.delete(key))
    }).pipe(Effect.catch((error) => Effect.logWarning(`media cleanup failed for ${key}: ${String(error.cause)}`)))
  }
}
