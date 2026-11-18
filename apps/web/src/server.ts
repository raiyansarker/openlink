import handler from '@tanstack/react-start/server-entry'

import { handleEmailBatch } from '#/server/email/consumer'
import type { EmailJob } from '#/server/email/job'
import type { WorkerBindings } from '#/server/env'

/**
 * Worker entry. TanStack Start serves HTTP; the same Worker also consumes the email queue.
 * `wrangler.jsonc` points `main` here.
 */
export default {
  fetch: handler.fetch,
  async queue(batch: MessageBatch<EmailJob>, env: WorkerBindings) {
    await handleEmailBatch(batch, env)
  },
}
