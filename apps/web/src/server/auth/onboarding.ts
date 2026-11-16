import { user } from '@openlink/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { Effect } from 'effect'

import { operation } from '../effect/operations'
import { Db } from '../effect/services/db'

/** Whether a person has finished onboarding: created or joined their first workspace. */
export class Onboarding {
  static isComplete(userId: string) {
    return Effect.gen(function* () {
      const db = yield* Db
      const [row] = yield* operation('onboarding.read', () =>
        db.select({ onboardedAt: user.onboardedAt }).from(user).where(eq(user.id, userId)).limit(1),
      )
      return Boolean(row?.onboardedAt)
    })
  }

  /** Records the first time only; later workspaces never move the date. */
  static markComplete(userId: string, at: Date) {
    return Effect.gen(function* () {
      const db = yield* Db
      yield* operation('onboarding.complete', () =>
        db
          .update(user)
          .set({ onboardedAt: at })
          .where(and(eq(user.id, userId), isNull(user.onboardedAt))),
      )
    })
  }
}
