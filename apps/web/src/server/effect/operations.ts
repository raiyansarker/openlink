import { Data, Effect } from 'effect'

export class BackendError extends Data.TaggedError('BackendError')<{
  operation: string
  cause: unknown
}> {}

/** Adapt external Promise-based APIs at the I/O boundary, preserving typed failures. */
export const operation = <A>(name: string, run: () => PromiseLike<A> | A) =>
  Effect.tryPromise({
    try: () => Promise.resolve(run()),
    catch: (cause) => new BackendError({ operation: name, cause }),
  })
