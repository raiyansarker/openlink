import { user } from '@openlink/db/schema'
import { eq } from 'drizzle-orm'
import { Data, Effect } from 'effect'

import { ProfileRules } from '#/lib/profile/rules'
import { operation } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'
import { MediaKey } from '#/server/media/media-key'
import { MediaStore } from '#/server/media/media-store'
import { MediaUploads } from '#/server/media/uploads'

/** A profile field was refused; `message` is safe to show. */
export class ProfileFieldRejected extends Data.TaggedError('ProfileFieldRejected')<{ message: string }> {}

/**
 * A person's name and picture. The picture is kept in `user.image` as the URL it is served
 * from; pictures from a sign-in provider (an external URL) are never deleted from storage.
 */
export class Profile {
  /**
   * Change the name and/or picture in one save. `image` as a file replaces the picture, null
   * removes it, absent keeps it. A new image is stored first and deleted again if the save
   * fails; the old one goes only once the row no longer points at it.
   */
  static update(userId: string, input: { name?: string | undefined; image?: Blob | null | undefined }) {
    return Effect.gen(function* () {
      let name: string | undefined
      if (input.name !== undefined) {
        const checked = ProfileRules.name(input.name)
        if (!checked.ok) return yield* Effect.fail(new ProfileFieldRejected({ message: checked.message }))
        name = checked.value
      }
      const db = yield* Db
      const [before] = yield* operation('profile.read', () =>
        db.select({ name: user.name, image: user.image }).from(user).where(eq(user.id, userId)).limit(1),
      )
      if (!before) return yield* Effect.fail(new ProfileFieldRejected({ message: 'Your account no longer exists.' }))

      const newKey = input.image ? yield* MediaUploads.storeImage('avatars', userId, input.image) : null
      const image = input.image === undefined ? before.image : newKey ? MediaKey.toUrl(newKey) : null
      const [after] = yield* operation('profile.save', () =>
        db
          .update(user)
          .set({ ...(name !== undefined ? { name } : {}), ...(input.image !== undefined ? { image } : {}), updatedAt: new Date() })
          .where(eq(user.id, userId))
          .returning({ name: user.name, image: user.image }),
      ).pipe(Effect.onError(() => MediaStore.removeQuietly(newKey)))

      if (input.image !== undefined && before.image !== image) yield* MediaStore.removeQuietly(MediaKey.fromUrl(before.image))
      return { name: after!.name, imageUrl: after!.image }
    })
  }
}
