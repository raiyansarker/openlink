import { isAPIError } from 'better-auth/api'
import type { BetterAuthOptions } from 'better-auth'

import { ServerLog } from '#/server/observability'

type AuthLogger = NonNullable<BetterAuthOptions['logger']>
type AuthApiErrorHandler = NonNullable<NonNullable<BetterAuthOptions['onAPIError']>['onError']>

/** Better Auth's own logs and API errors, written as the same JSON lines as the rest of the server. */
export class AuthLog {
  static readonly logger: AuthLogger = {
    level: 'warn',
    log: (level, message, ...args) =>
      ServerLog.write(level, 'auth.log', { message, ...(args.length > 0 ? { details: args } : {}) }),
  }

  /** Expected refusals (wrong password, rate limits) briefly; anything else with its stack. */
  static readonly onAPIError: AuthApiErrorHandler = (error) => {
    if (isAPIError(error) && error.statusCode < 500) {
      ServerLog.info('auth.api_rejected', { status: error.statusCode, code: error.status, message: error.message })
      return
    }
    ServerLog.error('auth.api_error', error)
  }
}
