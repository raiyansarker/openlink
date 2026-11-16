import { ErrorReport } from './error-report'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogFields = Record<string, unknown>

/**
 * One JSON object per line. Workers Logs indexes every field, so queries such as
 * `event = "api.procedure_failed"` or `error.operation = "password.deriveBits"` work.
 * Sensitive keys (passwords, tokens, cookies, secrets) are always redacted.
 */
export class ServerLog {
  static write(level: LogLevel, event: string, fields: LogFields = {}) {
    // `level` and `event` come last so a field of the same name cannot replace them.
    const entry = { timestamp: new Date().toISOString(), ...(ErrorReport.redact(fields) as LogFields), level, event }
    let line: string
    try {
      line = JSON.stringify(entry)
    } catch {
      line = JSON.stringify({ level, event, timestamp: entry.timestamp, note: 'fields were not serializable' })
    }
    ServerLog.sink(level)(line)
  }

  static info(event: string, fields?: LogFields) {
    ServerLog.write('info', event, fields)
  }

  static warn(event: string, fields?: LogFields) {
    ServerLog.write('warn', event, fields)
  }

  /** Logs `error` as a structured description (name, message, stack, cause chain). */
  static error(event: string, error: unknown, fields?: LogFields) {
    ServerLog.failure('error', event, error, fields)
  }

  /** A failure at any level, e.g. a `warn` for one the caller recovers from. */
  static failure(level: LogLevel, event: string, error: unknown, fields: LogFields = {}) {
    const description = ErrorReport.describe(error)
    ServerLog.write(level, event, { ...fields, reason: ErrorReport.rootMessage(description), error: description })
  }

  /** The console method decides the level shown in Workers Logs. */
  private static sink(level: LogLevel): (line: string) => void {
    switch (level) {
      case 'error':
        return console.error
      case 'warn':
        return console.warn
      case 'debug':
        return console.debug
      default:
        return console.log
    }
  }
}
