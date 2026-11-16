import { Cause, Data, Effect } from 'effect'

export class BackendError extends Data.TaggedError('BackendError')<{
  operation: string
  cause: unknown
}> {}

/**
 * Adapt external Promise-based APIs at the I/O boundary, preserving typed failures.
 * Each call is a trace span named after the operation, and a failure is logged with
 * the operation name and the original error, even when a caller recovers from it.
 */
export const operation = <A>(name: string, run: () => PromiseLike<A> | A) =>
  Effect.tryPromise({
    try: () => Promise.resolve(run()),
    catch: (cause) => new BackendError({ operation: name, cause }),
  }).pipe(
    Effect.tapError((error) => Effect.logWarning('operation.failed', Cause.fail(error)).pipe(Effect.annotateLogs({ operation: name }))),
    Effect.withSpan(name),
  )
