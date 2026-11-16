/** A plain, log-safe description of a thrown value and its `cause` chain. */
export type ErrorDescription = {
  name: string
  message: string
  /** Effect `Data.TaggedError` tag, e.g. `BackendError`. */
  tag?: string
  /** The failing I/O step for `BackendError`, e.g. `password.deriveBits`. */
  operation?: string
  /** oRPC / HTTP error code, when the error carries one. */
  code?: string
  status?: number
  stack?: string
  cause?: ErrorDescription
}

const REDACTED = '[redacted]'

/** Turns unknown failures into structured, secret-free data for logs and traces. */
export class ErrorReport {
  /** Field names whose values never reach a log line. */
  private static readonly SENSITIVE_KEY = /pass(word|phrase)?|secret|token|authorization|cookie|api[-_]?key|hash|otp|credential/i

  private static readonly MAX_DEPTH = 5

  static describe(error: unknown, depth = 0): ErrorDescription {
    if (!(error instanceof Error) && (typeof error !== 'object' || error === null)) {
      return { name: typeof error, message: ErrorReport.truncate(String(error)) }
    }

    const record = error as Record<string, unknown>
    const description: ErrorDescription = {
      name: error instanceof Error ? error.name : 'Object',
      message: ErrorReport.truncate(typeof record.message === 'string' ? record.message : ''),
    }
    if (typeof record._tag === 'string') description.tag = record._tag
    if (typeof record.operation === 'string') description.operation = record.operation
    if (typeof record.code === 'string') description.code = record.code
    if (typeof record.status === 'number') description.status = record.status
    if (error instanceof Error && error.stack) description.stack = error.stack
    if (!description.message && description.tag) description.message = description.tag

    if (record.cause !== undefined && record.cause !== error && depth < ErrorReport.MAX_DEPTH) {
      description.cause = ErrorReport.describe(record.cause, depth + 1)
    }
    return description
  }

  /** The innermost message, which is usually the actual reason (e.g. the D1 or crypto error). */
  static rootMessage(description: ErrorDescription): string {
    let current = description
    while (current.cause) current = current.cause
    return current.message || current.name
  }

  /** Deep copy with sensitive fields replaced, safe to log. */
  static redact(value: unknown, depth = 0): unknown {
    if (depth > ErrorReport.MAX_DEPTH) return '[truncated]'
    if (Array.isArray(value)) return value.map((item) => ErrorReport.redact(item, depth + 1))
    if (typeof value !== 'object' || value === null) return value
    if (value instanceof Error) return ErrorReport.describe(value)

    const out: Record<string, unknown> = {}
    for (const [key, entry] of Object.entries(value)) {
      out[key] = ErrorReport.SENSITIVE_KEY.test(key) ? REDACTED : ErrorReport.redact(entry, depth + 1)
    }
    return out
  }

  private static truncate(text: string, max = 2_000) {
    return text.length > max ? `${text.slice(0, max)}…` : text
  }
}
