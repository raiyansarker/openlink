import { ORPCError } from '@orpc/server'
import { Cause, Data, Effect } from 'effect'

import { AuthOrigins } from '../auth/origins'
import { requireLinkWriterEffect } from '../effect/access'
import { operation } from '../effect/operations'
import { Bindings } from '../effect/services/bindings'
import { WorkerRequest } from '../effect/services/request'
import { ImageFormat } from './image-format'
import { MediaKey, type MediaKind } from './media-key'
import { MediaStore } from './media-store'

/** An upload was refused; `message` is safe to show. */
export class UploadRejected extends Data.TaggedError('UploadRejected')<{ status: number; message: string }> {}

/**
 * Image checks and storage. Profile pictures and workspace logos arrive through the API
 * (`storeImage`); share cards still use their own upload route (`setLinkPreview`).
 */
export class MediaUploads {
  /** Already resized in the browser (256px WebP is ~20 KB); this only stops abuse. */
  static readonly MAX_BYTES = 1024 * 1024
  /** Share cards are shown large (1200×630), so they get more room. */
  static readonly MAX_PREVIEW_BYTES = 5 * 1024 * 1024

  /**
   * Cookie-authenticated writes must come from the app itself. Browsers always
   * send Origin on these requests, so a missing or foreign one is refused.
   */
  static readonly requireTrustedOrigin = Effect.gen(function* () {
    const request = yield* WorkerRequest
    const bindings = yield* Bindings
    const origin = request.headers.get('origin')
    if (!origin || !AuthOrigins.trusted(bindings).includes(origin)) {
      return yield* Effect.fail(new UploadRejected({ status: 403, message: 'This request was blocked.' }))
    }
  })

  static readImageUpTo(maxBytes: number) {
    return Effect.gen(function* () {
      const request = yield* WorkerRequest
      const tooLarge = MediaUploads.tooLarge
      const declared = Number(request.headers.get('content-length') ?? NaN)
      if (Number.isFinite(declared) && declared > maxBytes) return yield* Effect.fail(tooLarge())
      const buffer = yield* operation('media.readBody', () => request.arrayBuffer()).pipe(
        Effect.mapError(() => new UploadRejected({ status: 400, message: 'The upload could not be read.' })),
      )
      return yield* MediaUploads.checkImage(new Uint8Array(buffer), maxBytes)
    })
  }

  /**
   * Check an image that arrived as a file field (multipart API requests) and store it
   * under a new key. Resolves to the key; nothing is stored if the image is refused.
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

  /**
   * Store a share-card image for a workspace's links; anyone who can edit links.
   * The URL is then saved on the link through the regular link API.
   */
  static setLinkPreview(organizationId: string) {
    return Effect.gen(function* () {
      yield* MediaUploads.requireTrustedOrigin
      yield* requireLinkWriterEffect(organizationId)
      const image = yield* MediaUploads.readImageUpTo(MediaUploads.MAX_PREVIEW_BYTES)
      const key = MediaKey.create('previews', organizationId, image.extension)
      yield* MediaStore.put(key, image.bytes, image.mime)
      return { url: MediaKey.toUrl(key) }
    })
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

  private static readonly ORPC_STATUS: Record<string, number> = { UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404 }

  /** Turn an upload outcome into the HTTP response, hiding internal failures. */
  static respond<A, R>(effect: Effect.Effect<A, unknown, R>, toBody: (value: A) => unknown) {
    return effect.pipe(
      Effect.map((value) => {
        const body = toBody(value)
        return body === undefined
          ? new Response(null, { status: 204 })
          : Response.json(body, { headers: { 'cache-control': 'no-store' } })
      }),
      Effect.catch((error: unknown) => {
        if (error instanceof UploadRejected) return Effect.succeed(Response.json({ message: error.message }, { status: error.status }))
        if (error instanceof ORPCError) {
          const status = MediaUploads.ORPC_STATUS[error.code] ?? 400
          return Effect.succeed(Response.json({ message: error.message }, { status }))
        }
        return Effect.logError('media.upload_failed', Cause.fail(error)).pipe(
          Effect.as(Response.json({ message: 'The upload failed. Please try again.' }, { status: 500 })),
        )
      }),
    )
  }
}

