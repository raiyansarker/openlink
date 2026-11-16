import { organization, organizationMember } from '@openlink/db/schema'
import { and, eq } from 'drizzle-orm'
import { Data, Effect } from 'effect'

import { ProfileRules } from '#/lib/profile/rules'
import { operation } from '../effect/operations'
import { Db } from '../effect/services/db'

/** A profile field was rejected; `message` is safe to show. */
export class ProfileFieldRejected extends Data.TaggedError('ProfileFieldRejected')<{ message: string }> {}

/** The account still owns workspaces, which would be left without an owner. */
export class AccountStillOwnsWorkspaces extends Data.TaggedError('AccountStillOwnsWorkspaces')<{
  workspaces: string[]
}> {
  get message() {
    const names = this.workspaces.join(', ')
    return `You own ${names}. Transfer ownership or delete ${this.workspaces.length === 1 ? 'it' : 'them'} before deleting your account.`
  }
}

type UserFields = { name?: unknown; image?: unknown } & Record<string, unknown>

/** Rules Better Auth's user hooks apply before anything is written. */
export class AccountPolicy {
  /**
   * New accounts come from sign-up or from a Google/GitHub sign-in. A provider
   * picture we would not accept is dropped rather than failing the sign-in.
   */
  static sanitizeNewUser<T extends UserFields>(user: T) {
    return Effect.gen(function* () {
      const name = ProfileRules.name(user.name)
      if (!name.ok) return yield* Effect.fail(new ProfileFieldRejected({ message: name.message }))
      return { ...user, name: name.value, image: ProfileRules.providerImage(user.image) }
    })
  }

  /**
   * Profile edits through Better Auth's update endpoint. The picture changes
   * only through the upload endpoint (which stores it in R2), so a client cannot
   * point its picture at an arbitrary URL here.
   */
  static validateUpdate<T extends UserFields>(update: T, options: { fromProfileEndpoint: boolean }) {
    return Effect.gen(function* () {
      const next: UserFields = { ...update }
      if ('name' in update && update.name !== undefined) {
        const name = ProfileRules.name(update.name)
        if (!name.ok) return yield* Effect.fail(new ProfileFieldRejected({ message: name.message }))
        next.name = name.value
      }
      if (options.fromProfileEndpoint && 'image' in update && update.image !== undefined) {
        return yield* Effect.fail(new ProfileFieldRejected({ message: 'Change your picture with the Upload button.' }))
      }
      return next as T
    })
  }

  /** Names of workspaces this user owns. */
  static ownedWorkspaces(userId: string) {
    return Effect.gen(function* () {
      const db = yield* Db
      const rows = yield* operation('account.ownedWorkspaces', () =>
        db
          .select({ name: organization.name })
          .from(organizationMember)
          .innerJoin(organization, eq(organization.id, organizationMember.organizationId))
          .where(and(eq(organizationMember.userId, userId), eq(organizationMember.role, 'owner'))),
      )
      return rows.map((row) => row.name)
    })
  }

  /** Deleting would cascade away the owner membership and orphan the workspace. */
  static ensureDeletable(userId: string) {
    return Effect.gen(function* () {
      const owned = yield* AccountPolicy.ownedWorkspaces(userId)
      if (owned.length > 0) return yield* Effect.fail(new AccountStillOwnsWorkspaces({ workspaces: owned }))
    })
  }
}
