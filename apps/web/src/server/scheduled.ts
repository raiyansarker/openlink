import type { OpenLinkDb } from '@openlink/db'

import { ServerLog } from './observability/server-log'
import { RateLimiter } from './rate-limit/limiter'

/** Cron schedules in `wrangler.jsonc` (`triggers.crons`). */
export const CRONS = {
  /** Every hour: delete rate-limit windows that have ended. */
  pruneRateLimits: '0 * * * *',
} as const

/** The Worker's `scheduled` handler: runs the job for the cron that fired. */
export async function runScheduled(controller: { cron: string; scheduledTime: number }, db: () => OpenLinkDb) {
  if (controller.cron !== CRONS.pruneRateLimits) {
    ServerLog.warn('cron.unknown', { cron: controller.cron })
    return
  }
  try {
    const deleted = await new RateLimiter(db).prune(controller.scheduledTime)
    ServerLog.info('cron.rate_limits_pruned', { deleted })
  } catch (error) {
    // Logged, not rethrown: the next run retries, and a failed run only leaves stale rows behind.
    ServerLog.error('cron.rate_limits_prune_failed', error)
  }
}
