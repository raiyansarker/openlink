import type { EffectWrapOptions } from '@orpc/effect'
import { ORPCError } from '@orpc/server'
import { Cause, Effect } from 'effect'

/** Map unexpected failures to ORPC errors; preserve thrown ORPCError. */
export function wrapApiEffect<A>(
  effect: Effect.Effect<A, unknown>,
  _opts: EffectWrapOptions,
): Effect.Effect<A, unknown> {
  return effect.pipe(
    Effect.catchCause((cause) => {
      const error = Cause.squash(cause)
      if (error instanceof ORPCError) {
        return Effect.fail(error)
      }
      if (error instanceof Error) {
        return Effect.fail(
          new ORPCError('INTERNAL_SERVER_ERROR', {
            message: error.message,
            cause: error,
          }),
        )
      }
      return Effect.failCause(cause)
    }),
  )
}
