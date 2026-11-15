import { session } from '@openlink/db/schema'
import { and, desc, eq, ne } from 'drizzle-orm'
import { Data, Effect } from 'effect'

import { operation } from '../effect/operations'
import { Db } from '../effect/services/db'

export class DeviceSessionNotFound extends Data.TaggedError('DeviceSessionNotFound')<{}> {}
/** Signing out the current device goes through the normal sign-out instead. */
export class CannotRevokeCurrentSession extends Data.TaggedError('CannotRevokeCurrentSession')<{}> {}

/** A person's signed-in devices. Session tokens never leave the server. */
export class DeviceSessions {
  private static readonly columns = {
    id: session.id,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    city: session.city,
    country: session.country,
    latitude: session.latitude,
    longitude: session.longitude,
    signInMethod: session.signInMethod,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    expiresAt: session.expiresAt,
  }

  /** Unexpired sessions, most recently active first. */
  static list(userId: string, now = new Date()) {
    return Effect.gen(function* () {
      const db = yield* Db
      const rows = yield* operation('devices.list', () =>
        db.select(DeviceSessions.columns).from(session).where(eq(session.userId, userId)).orderBy(desc(session.updatedAt)),
      )
      return rows.filter((row) => row.expiresAt > now)
    })
  }

  static revoke(input: { userId: string; sessionId: string; currentSessionId: string }) {
    return Effect.gen(function* () {
      if (input.sessionId === input.currentSessionId) return yield* Effect.fail(new CannotRevokeCurrentSession())
      const db = yield* Db
      const deleted = yield* operation('devices.revoke', () =>
        db
          .delete(session)
          .where(and(eq(session.id, input.sessionId), eq(session.userId, input.userId)))
          .returning({ id: session.id }),
      )
      if (deleted.length === 0) return yield* Effect.fail(new DeviceSessionNotFound())
    })
  }

  /** Every session of this person except the one making the request. */
  static revokeOthers(input: { userId: string; currentSessionId: string }) {
    return Effect.gen(function* () {
      const db = yield* Db
      const deleted = yield* operation('devices.revokeOthers', () =>
        db
          .delete(session)
          .where(and(eq(session.userId, input.userId), ne(session.id, input.currentSessionId)))
          .returning({ id: session.id }),
      )
      return deleted.length
    })
  }
}
