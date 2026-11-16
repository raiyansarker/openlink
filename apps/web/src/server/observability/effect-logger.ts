import { Cause, Logger, References } from 'effect'
import type { LogLevel as EffectLogLevel } from 'effect'

import { ServerLog, type LogFields, type LogLevel } from './server-log'

/**
 * Routes `Effect.log*` through {@link ServerLog}, so Effect logs share the JSON shape
 * of every other server log. Log annotations (`Effect.annotateLogs`) become fields,
 * and a logged `Cause` becomes a structured `error` with its stack and cause chain.
 */
export class EffectLogger {
  static readonly logger = Logger.make<unknown, void>(({ message, logLevel, cause, fiber }) => {
    const annotations = fiber.getRef(References.CurrentLogAnnotations)
    const parts = Array.isArray(message) ? message : [message]
    const [first, ...rest] = parts
    const event = typeof first === 'string' ? first : 'effect.log'
    const fields: LogFields = { ...annotations }
    const extra = typeof first === 'string' ? rest : parts
    if (extra.length > 0) fields.details = extra.length === 1 ? extra[0] : extra

    const level = EffectLogger.level(logLevel)
    if (cause.reasons.length > 0 && !Cause.hasInterruptsOnly(cause)) {
      ServerLog.failure(level, event, Cause.squash(cause), fields)
      return
    }
    ServerLog.write(level, event, fields)
  })

  /** Replaces Effect's default pretty logger. */
  static readonly layer = Logger.layer([EffectLogger.logger])

  private static level(level: EffectLogLevel.LogLevel): LogLevel {
    switch (level) {
      case 'Fatal':
      case 'Error':
        return 'error'
      case 'Warn':
        return 'warn'
      case 'Debug':
      case 'Trace':
        return 'debug'
      default:
        return 'info'
    }
  }
}
