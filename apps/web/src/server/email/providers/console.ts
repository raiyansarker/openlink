import { ServerLog } from '../../observability/server-log'
import type { EmailProvider } from '../provider'

/**
 * Prints emails to the terminal instead of sending them. Used only under `vite dev`
 * (see `providers/index.ts`): the body holds links that sign people in.
 */
export const consoleProvider: EmailProvider = {
  name: 'console',
  async send(email) {
    ServerLog.info('email.logged', { to: email.to, subject: email.subject, text: email.text })
  },
}
