import { EventBus } from '#/server/events/bus'
import { activityEvent } from '@openlink/db/schema'
import { and, desc, eq, lt, or, type SQL } from 'drizzle-orm'
import { Effect } from 'effect'

import { operation } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'
import { ACTION_DEFINITIONS, type ActivityAction, type ActivityCategory, type Change } from './actions'

export type ActivityActor =
  | { type: 'member'; userId: string; label: string }
  | { type: 'api_key'; label: string }
  | { type: 'system'; label: string }

export type RecordActivityInput = {
  organizationId: string
  actor: ActivityActor
  action: ActivityAction
  target: { type: string; id?: string; label: string }
  source?: 'dashboard' | 'api' | 'automation'
  changes?: Change[]
  ipAddress?: string | null
}

/** Append an audit event. The category always comes from the action catalog. */
export function recordActivity(input: RecordActivityInput) {
  return Effect.gen(function* () {
    const db = yield* Db
    yield* operation('activity.record', () =>
      db.insert(activityEvent).values({
        id: crypto.randomUUID(),
        organizationId: input.organizationId,
        actorType: input.actor.type,
        actorUserId: input.actor.type === 'member' ? input.actor.userId : null,
        actorLabel: input.actor.label,
        action: input.action,
        category: ACTION_DEFINITIONS[input.action].category,
        targetType: input.target.type,
        targetId: input.target.id ?? null,
        targetLabel: input.target.label,
        source: input.source ?? 'dashboard',
        detailsJson: input.changes && input.changes.length > 0 ? JSON.stringify({ changes: input.changes }) : null,
        ipAddress: input.ipAddress ?? null,
        createdAt: new Date(),
      }),
    )
  })
}

/**
 * Audit logging must never fail the user's action, which has already
 * succeeded. A failed write is logged and dropped.
 */
/** Record activity and publish it as a workspace event; neither can fail the caller. */
export const recordActivityQuietly = (input: RecordActivityInput) =>
  recordActivity(input).pipe(
    Effect.catch((error) =>
      Effect.logWarning(`activity.record failed for ${input.action}: ${String(error.cause)}`),
    ),
    Effect.andThen(EventBus.publish(activityToEvent(input))),
  )

/** The workspace event an activity entry stands for. */
export function activityToEvent(input: RecordActivityInput) {
  const { actor } = input
  return EventBus.create(input.action, input.organizationId, {
    subject: input.target,
    ...(actor.type === 'system'
      ? {}
      : { actor: actor.type === 'member' ? { type: 'member' as const, id: actor.userId, label: actor.label } : { type: 'api_key' as const, label: actor.label } }),
    ...(input.changes && input.changes.length > 0 ? { data: { changes: input.changes } } : {}),
  })
}

export const DEFAULT_ACTIVITY_PAGE = 50
export const MAX_ACTIVITY_PAGE = 100

export const encodeCursor = (row: { createdAt: Date; id: string }) => `${row.createdAt.getTime()}:${row.id}`

export function decodeCursor(cursor: string | undefined): { at: Date; id: string } | null {
  if (!cursor) return null
  const separator = cursor.indexOf(':')
  const ms = Number(cursor.slice(0, separator))
  if (separator < 1 || !Number.isFinite(ms)) return null
  return { at: new Date(ms), id: cursor.slice(separator + 1) }
}

const beforeCursor = (cursor: { at: Date; id: string }): SQL =>
  or(lt(activityEvent.createdAt, cursor.at), and(eq(activityEvent.createdAt, cursor.at), lt(activityEvent.id, cursor.id)))!

type ListInput = {
  organizationId: string
  category?: ActivityCategory
  target?: { type: string; id: string }
  limit?: number
  cursor?: string
}

/** Newest first, with a cursor that stays stable while new events arrive. */
export function listActivity(input: ListInput) {
  return Effect.gen(function* () {
    const db = yield* Db
    const limit = Math.min(Math.max(input.limit ?? DEFAULT_ACTIVITY_PAGE, 1), MAX_ACTIVITY_PAGE)
    const cursor = decodeCursor(input.cursor)
    const rows = yield* operation('activity.list', () =>
      db
        .select()
        .from(activityEvent)
        .where(
          and(
            eq(activityEvent.organizationId, input.organizationId),
            input.category ? eq(activityEvent.category, input.category) : undefined,
            input.target
              ? and(eq(activityEvent.targetType, input.target.type), eq(activityEvent.targetId, input.target.id))
              : undefined,
            cursor ? beforeCursor(cursor) : undefined,
          ),
        )
        .orderBy(desc(activityEvent.createdAt), desc(activityEvent.id))
        .limit(limit + 1),
    )
    const items = rows.slice(0, limit)
    return { items, nextCursor: rows.length > limit ? encodeCursor(items[items.length - 1]!) : undefined }
  })
}
