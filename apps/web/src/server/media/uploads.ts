import { organization, user } from '@openlink/db/schema'
import { ORPCError } from '@orpc/server'
import { eq } from 'drizzle-orm'
import { Data, Effect } from 'effect'

import { audit } from '../activity/audit'
import { AuthOrigins } from '../auth/origins'
import { requireOrgAdminEffect } from '../effect/access'
import { operation } from '../effect/operations'
import { Bindings } from '../effect/services/bindings'
import { Db } from '../effect/services/db'
import { WorkerRequest } from '../effect/services/request'
import { requireAuthSession } from '../effect/session'
import { ImageFormat } from './image-format'
import { MediaKey } from './media-key'
import { MediaStore } from './media-store'

/** An upload was refused; `message` is safe to show. */
export class UploadRejected extends Data.TaggedError('UploadRejected')<{ status: number; message: string }> {}

/** Image uploads for profile pictures and workspace logos. */
export class MediaUploads {
  /** Already resized in the browser (256px WebP is ~20 KB); this only stops abuse. */
  static readonly MAX_BYTES = 1024 * 1024

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

  /** Read the body as an image, checking size and the real format. */
  static readonly readImage = Effect.gen(function* () {
    const request = yield* WorkerRequest
    const declared = Number(request.headers.get('content-length') ?? NaN)
    if (Number.isFinite(declared) && declared > MediaUploads.MAX_BYTES) {
      return yield* Effect.fail(new UploadRejected({ status: 413, message: 'That picture is too large.' }))
    }
    const buffer = yield* operation('media.readBody', () => request.arrayBuffer()).pipe(
      Effect.mapError(() => new UploadRejected({ status: 400, message: 'The upload could not be read.' })),
    )
    if (buffer.byteLength > MediaUploads.MAX_BYTES) {
      return yield* Effect.fail(new UploadRejected({ status: 413, message: 'That picture is too large.' }))
    }
    const bytes = new Uint8Array(buffer)
    const format = ImageFormat.detect(bytes)
    if (!format) {
      return yield* Effect.fail(new UploadRejected({ status: 415, message: 'Use a PNG, JPG, WebP, or GIF picture.' }))
    }
    return { bytes, ...format }
  })

  /** Replace the signed-in person's picture. API keys cannot change a person's profile. */
  static readonly setAvatar = Effect.gen(function* () {
    yield* MediaUploads.requireTrustedOrigin
    const session = yield* requireAuthSession
    const image = yield* MediaUploads.readImage
    const userId = session.session.user.id
    const key = MediaKey.create('avatars', userId, image.extension)
    yield* MediaStore.put(key, image.bytes, image.mime)

    const db = yield* Db
    const [previous] = yield* operation('media.avatar.read', () =>
      db.select({ image: user.image }).from(user).where(eq(user.id, userId)).limit(1),
    )
    const url = MediaKey.toUrl(key)
    yield* operation('media.avatar.save', () =>
      db.update(user).set({ image: url, updatedAt: new Date() }).where(eq(user.id, userId)),
    ).pipe(Effect.tapError(() => MediaStore.removeQuietly(key)))
    yield* MediaStore.removeQuietly(MediaKey.fromUrl(previous?.image))
    return { url }
  })

  static readonly clearAvatar = Effect.gen(function* () {
    yield* MediaUploads.requireTrustedOrigin
    const session = yield* requireAuthSession
    const userId = session.session.user.id
    const db = yield* Db
    const [previous] = yield* operation('media.avatar.read', () =>
      db.select({ image: user.image }).from(user).where(eq(user.id, userId)).limit(1),
    )
    yield* operation('media.avatar.clear', () =>
      db.update(user).set({ image: null, updatedAt: new Date() }).where(eq(user.id, userId)),
    )
    yield* MediaStore.removeQuietly(MediaKey.fromUrl(previous?.image))
  })

  /** Replace a workspace logo; owners and admins only. */
  static setLogo(organizationId: string) {
    return Effect.gen(function* () {
      yield* MediaUploads.requireTrustedOrigin
      const { session } = yield* requireOrgAdminEffect(organizationId)
      const image = yield* MediaUploads.readImage
      const key = MediaKey.create('logos', organizationId, image.extension)
      yield* MediaStore.put(key, image.bytes, image.mime)

      const db = yield* Db
      const [previous] = yield* operation('media.logo.read', () =>
        db.select({ logoKey: organization.logoKey, name: organization.name }).from(organization).where(eq(organization.id, organizationId)).limit(1),
      )
      yield* operation('media.logo.save', () =>
        db.update(organization).set({ logoKey: key, updatedAt: new Date() }).where(eq(organization.id, organizationId)),
      ).pipe(Effect.tapError(() => MediaStore.removeQuietly(key)))
      yield* MediaStore.removeQuietly(previous?.logoKey)
      yield* audit(session, {
        organizationId,
        action: 'workspace.updated',
        target: { type: 'workspace', id: organizationId, label: previous?.name ?? organizationId },
        changes: [{ label: 'Logo', from: previous?.logoKey ? 'set' : 'none', to: 'updated' }],
      })
      return { url: MediaKey.toUrl(key) }
    })
  }

  static clearLogo(organizationId: string) {
    return Effect.gen(function* () {
      yield* MediaUploads.requireTrustedOrigin
      const { session } = yield* requireOrgAdminEffect(organizationId)
      const db = yield* Db
      const [previous] = yield* operation('media.logo.read', () =>
        db.select({ logoKey: organization.logoKey, name: organization.name }).from(organization).where(eq(organization.id, organizationId)).limit(1),
      )
      if (!previous?.logoKey) return
      yield* operation('media.logo.clear', () =>
        db.update(organization).set({ logoKey: null, updatedAt: new Date() }).where(eq(organization.id, organizationId)),
      )
      yield* MediaStore.removeQuietly(previous.logoKey)
      yield* audit(session, {
        organizationId,
        action: 'workspace.updated',
        target: { type: 'workspace', id: organizationId, label: previous.name },
        changes: [{ label: 'Logo', from: 'set', to: 'none' }],
      })
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
        return Effect.logError(`media upload failed: ${String(error)}`).pipe(
          Effect.as(Response.json({ message: 'The upload failed. Please try again.' }, { status: 500 })),
        )
      }),
    )
  }
}

