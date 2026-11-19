import handler from '@tanstack/react-start/server-entry'

/**
 * Worker entry. TanStack Start serves HTTP; the same Worker hosts the email workflow.
 * `wrangler.jsonc` points `main` here, and Workflow classes must be exported from it.
 */
export { EmailWorkflow } from '#/server/email/workflow'

export default {
  fetch: handler.fetch,
}
