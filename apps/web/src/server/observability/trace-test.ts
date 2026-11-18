import { tracing } from 'cloudflare:workers'
import { Data, Effect } from 'effect'

import { BackendError, operation } from '#/server/effect/operations'
import { Bindings } from '#/server/effect/services/bindings'

/** Deliberate failure raised by the trace test endpoint. Its message says so. */
export class TraceTestError extends Data.TaggedError('TraceTestError')<{
  readonly kind: string
  readonly message: string
}> {}

export type TraceTestKind = 'ok' | 'typed' | 'defect' | 'operation' | 'nested'

/**
 * Scenarios for checking Workers tracing end to end. Each one runs inside named Effect spans, so a trace
 * should show `trace_test.*` spans (failed ones with the exception), and the D1 span under `trace_test.d1`.
 */
export class TraceTest {
  static readonly KINDS: readonly TraceTestKind[] = ['ok', 'typed', 'defect', 'operation', 'nested']

  static isKind(value: string | null): value is TraceTestKind {
    return TraceTest.KINDS.includes(value as TraceTestKind)
  }

  /** The id of the Workers trace the request is part of, to look it up in the dashboard. */
  static traceId(): string | undefined {
    try {
      return tracing.getActiveSpan()?.spanContext().traceId
    } catch {
      return undefined
    }
  }

  static run(kind: TraceTestKind): Effect.Effect<string, TraceTestError | BackendError, Bindings> {
    switch (kind) {
      case 'ok':
        return TraceTest.ok
      case 'typed':
        return Effect.fail(
          new TraceTestError({ kind, message: '[trace-test] typed failure: expected error raised on purpose' }),
        ).pipe(Effect.withSpan('trace_test.typed'))
      case 'defect':
        return Effect.die(new Error('[trace-test] defect: unexpected exception thrown on purpose')).pipe(
          Effect.withSpan('trace_test.defect'),
        )
      case 'operation':
        return operation('trace_test.operation', async () => {
          throw new TypeError('[trace-test] operation: rejected promise at an I/O boundary')
        }).pipe(Effect.map(() => 'unreachable'))
      case 'nested':
        return TraceTest.nested
    }
  }

  /** Three nested spans with a D1 query in the middle; nothing fails. */
  private static readonly ok = Effect.gen(function* () {
    const bindings = yield* Bindings
    yield* Effect.annotateCurrentSpan({ 'trace_test.kind': 'ok' })
    yield* operation('trace_test.d1', () => bindings.DB.prepare('SELECT 1 AS ok').first()).pipe(
      Effect.withSpan('trace_test.d1_outer'),
    )
    yield* Effect.sleep('20 millis').pipe(Effect.withSpan('trace_test.sleep'))
    return '[trace-test] ok: nested spans and a D1 query completed'
  }).pipe(Effect.withSpan('trace_test.ok'))

  /** The failure starts at the deepest span and passes through every parent. */
  private static readonly nested = Effect.gen(function* () {
    yield* Effect.annotateCurrentSpan({ 'trace_test.kind': 'nested', 'trace_test.depth': 3 })
    return yield* Effect.fail(
      new TraceTestError({ kind: 'nested', message: '[trace-test] nested: failure at depth 3' }),
    ).pipe(Effect.withSpan('trace_test.level_3'))
  }).pipe(Effect.withSpan('trace_test.level_2'), Effect.withSpan('trace_test.level_1'))
}
