import handler from '@tanstack/react-start/server-entry'

import { getDb } from '#/server/db'
import { runScheduled } from '#/server/scheduled'

/**
 * Worker entry. TanStack Start serves HTTP; the same Worker hosts the email workflow and
 * runs the crons in `wrangler.jsonc`. `main` points here, and Workflow classes must be exported from it.
 */
export { EmailWorkflow } from '#/server/email/workflow'

export default {
  fetch: handler.fetch,
  scheduled(controller: ScheduledController, _env: unknown, ctx: ExecutionContext) {
    ctx.waitUntil(runScheduled(controller, getDb))
  },
}
