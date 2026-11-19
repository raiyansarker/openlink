import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers'
import { NonRetryableError } from 'cloudflare:workflows'

import type { WorkerBindings } from '../env'
import { deliverEmail } from './delivery'
import type { SealedEmailJob } from './sealed-job'

/**
 * One run per email, with a single step: decrypt, render and send (see `delivery.ts`).
 * The run's params are encrypted and the step returns nothing, so the dashboard shows
 * the template name and the outcome, not the recipient or the links.
 *
 * Transient failures (rate limits, outages, network) retry with exponential backoff:
 * 30s, 1m, 2m, ... After the last retry the run is marked errored in the dashboard.
 * Failures that cannot succeed (a rejected address, missing configuration) are not retried.
 */
export class EmailWorkflow extends WorkflowEntrypoint<WorkerBindings, SealedEmailJob> {
  async run(event: WorkflowEvent<SealedEmailJob>, step: WorkflowStep): Promise<void> {
    await step.do('send', { retries: { limit: 6, delay: '30 seconds', backoff: 'exponential' }, timeout: '1 minute' }, async () => {
      const failure = await deliverEmail(this.env, event.payload, event.instanceId)
      if (!failure) return
      if (!failure.retryable) throw new NonRetryableError(failure.reason)
      throw new Error(failure.reason)
    })
  }
}
