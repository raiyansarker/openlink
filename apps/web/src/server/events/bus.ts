import type { WorkspaceEventType } from '@openlink/contracts'
import { Effect } from 'effect'

/** What an event is about. */
export type EventSubject = { type: string; id?: string; label: string }

/** Who caused it; absent for things the system notices (clicks, DNS). */
export type EventActor = { type: 'member' | 'api_key'; id?: string; label: string }

export type WorkspaceEvent<T extends WorkspaceEventType = WorkspaceEventType> = {
  id: string
  type: T
  organizationId: string
  occurredAt: string
  subject?: EventSubject
  actor?: EventActor
  data?: Readonly<Record<string, unknown>>
}

/** A consumer of workspace events (webhooks, notifications, …). Failures never reach the publisher. */
export interface EventSink {
  readonly name: string
  deliver(event: WorkspaceEvent): Effect.Effect<void, unknown>
}

/**
 * Where workspace events go. Publishing is fire-and-forget: a slow or broken
 * consumer must never fail a redirect or an API call. Consumers register a
 * sink; until then events are only logged at debug level.
 */
export class EventBus {
  private static readonly sinks: EventSink[] = []

  static register(sink: EventSink): () => void {
    EventBus.sinks.push(sink)
    return () => {
      const index = EventBus.sinks.indexOf(sink)
      if (index >= 0) EventBus.sinks.splice(index, 1)
    }
  }

  static create<T extends WorkspaceEventType>(
    type: T,
    organizationId: string,
    details: Pick<WorkspaceEvent<T>, 'subject' | 'actor' | 'data'> = {},
    now = new Date(),
  ): WorkspaceEvent<T> {
    return { id: crypto.randomUUID(), type, organizationId, occurredAt: now.toISOString(), ...details }
  }

  static publish(event: WorkspaceEvent): Effect.Effect<void> {
    return Effect.gen(function* () {
      yield* Effect.logDebug(`event ${event.type}`).pipe(Effect.annotateLogs({ organizationId: event.organizationId }))
      // A copy: a sink may unregister while events are being delivered.
      for (const sink of EventBus.sinks.slice()) {
        yield* sink.deliver(event).pipe(
          Effect.catchCause((cause) => Effect.logWarning(`event sink ${sink.name} failed for ${event.type}`, cause)),
        )
      }
    })
  }
}
