import { Effect } from 'effect'

import type { AppServices } from '../effect/layer'
import { effectRuntime } from '../effect/runtime'
import { WorkerRequest } from '../effect/services/request'
import { MediaUploads } from './uploads'

/** Runs an upload Effect for an incoming request on the shared runtime. */
export class MediaHttp {
  static handle<A>(
    request: Request,
    effect: Effect.Effect<A, unknown, AppServices | WorkerRequest>,
    toBody: (value: A) => unknown,
  ): Promise<Response> {
    return effectRuntime.runPromise(
      MediaUploads.respond(effect, toBody).pipe(Effect.provideService(WorkerRequest, request)),
    )
  }
}
