import { Context } from 'effect'

/** Current HTTP request; provided per API call via `effect/context`. */
export class WorkerRequest extends Context.Service<WorkerRequest, Request>()(
  'openlink/WorkerRequest',
) {}
