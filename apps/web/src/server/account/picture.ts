import { user } from '@openlink/db/schema'
import { eq } from 'drizzle-orm'
import { Effect } from 'effect'

import { operation } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'
import { MediaKey } from '#/server/media/media-key'
import { MediaStore } from '#/server/media/media-store'
import { MediaUploads } from '#/server/media/uploads'

/**
 * A person's profile picture, kept in `user.image` as the URL it is served from.
 * Pictures from a sign-in provider (an external URL) are never deleted from storage.
 */
export class ProfilePicture {
  /**
   * Check and store the image, then point the profile at it. If the profile can't be
   * updated, the new image is deleted again; the old one goes only once nothing points at it.
   */
  static replace(userId: string, image: Blob) {
    return Effect.gen(function* () {
      const previous = yield* ProfilePicture.current(userId)
      const key = yield* MediaUploads.storeImage('avatars', userId, image)
      const imageUrl = MediaKey.toUrl(key)
      yield* ProfilePicture.save(userId, imageUrl).pipe(Effect.onError(() => MediaStore.removeQuietly(key)))
      yield* MediaStore.removeQuietly(MediaKey.fromUrl(previous))
      return imageUrl
    })
  }

  static remove(userId: string) {
    return Effect.gen(function* () {
      const previous = yield* ProfilePicture.current(userId)
      if (!previous) return
      yield* ProfilePicture.save(userId, null)
      yield* MediaStore.removeQuietly(MediaKey.fromUrl(previous))
    })
  }

  private static current(userId: string) {
    return Effect.gen(function* () {
      const db = yield* Db
      const [row] = yield* operation('profile.picture.read', () =>
        db.select({ image: user.image }).from(user).where(eq(user.id, userId)).limit(1),
      )
      return row?.image ?? null
    })
  }

  private static save(userId: string, image: string | null) {
    return Effect.gen(function* () {
      const db = yield* Db
      yield* operation('profile.picture.save', () =>
        db.update(user).set({ image, updatedAt: new Date() }).where(eq(user.id, userId)),
      )
    })
  }
}
