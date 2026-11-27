import { Data, Effect } from 'effect'

import { operation } from '../effect/operations'
import { ImageFormat } from './image-format'
import { MediaKey, type MediaKind } from './media-key'
import { MediaStore } from './media-store'

/** An upload was refused; `message` is safe to show. */
export class UploadRejected extends Data.TaggedError('UploadRejected')<{ status: number; message: string }> {}

/**
 * Image checks, storage and serving. Images arrive as file fields on the API requests they
 * belong to (workspace logo, profile picture, link share card) and are stored by `storeImage`.
 */
export class MediaUploads {
  /** Already resized in the browser (256px WebP is ~20 KB); this only stops abuse. */
  static readonly MAX_BYTES = 1024 * 1024
  /** Share cards are shown large (1200×630), so they get more room. */
  static readonly MAX_PREVIEW_BYTES = 5 * 1024 * 1024

  /**
   * Check an image that arrived as a file field and store it under a new key.
   * Resolves to the key; nothing is stored if the image is refused.
   */
  static storeImage(kind: MediaKind, ownerId: string, file: Blob, maxBytes = MediaUploads.MAX_BYTES) {
    return Effect.gen(function* () {
      if (file.size > maxBytes) return yield* Effect.fail(MediaUploads.tooLarge())
      const buffer = yield* operation('media.readFile', () => file.arrayBuffer()).pipe(
        Effect.mapError(() => new UploadRejected({ status: 400, message: 'The upload could not be read.' })),
      )
      const image = yield* MediaUploads.checkImage(new Uint8Array(buffer), maxBytes)
      const key = MediaKey.create(kind, ownerId, image.extension)
      yield* MediaStore.put(key, image.bytes, image.mime)
      return key
    })
  }

  /** Size and real format (from the file's first bytes, not its name or declared type). */
  private static checkImage(bytes: Uint8Array, maxBytes: number) {
    return Effect.gen(function* () {
      if (bytes.byteLength > maxBytes) return yield* Effect.fail(MediaUploads.tooLarge())
      const format = ImageFormat.detect(bytes)
      if (!format) {
        return yield* Effect.fail(new UploadRejected({ status: 415, message: 'Use a PNG, JPG, WebP, or GIF picture.' }))
      }
      return { bytes, ...format }
    })
  }

  private static tooLarge() {
    return new UploadRejected({ status: 413, message: 'That picture is too large.' })
  }

  /** Serve a stored image. Keys are unguessable and change on every upload, so caching is permanent. */
  static serve(rawKey: string) {
    return Effect.gen(function* () {
      const key = MediaKey.parse(rawKey)
      if (!key) return MediaUploads.notFound()
      const object = yield* MediaStore.get(key).pipe(Effect.catchTag('MediaNotFound', () => Effect.succeed(null)))
      if (!object) return MediaUploads.notFound()
      return new Response(object.body as unknown as BodyInit, {
        headers: {
          'content-type': object.httpMetadata?.contentType ?? 'application/octet-stream',
          'cache-control': 'public, max-age=31536000, immutable',
          etag: object.httpEtag,
          'x-content-type-options': 'nosniff',
          'content-security-policy': "default-src 'none'; sandbox",
        },
      })
    })
  }

  private static notFound() {
    return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } })
  }
}
