import { Effect } from 'effect'

/** Run async IO from an Effect generator (`yield* io(...)` — no bare `await` in `function*`). */
export const io = <A>(run: () => Promise<A>): Effect.Effect<A> => Effect.promise(run)
