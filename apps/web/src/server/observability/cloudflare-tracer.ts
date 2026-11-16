import { tracing } from 'cloudflare:workers'
import { Cause, Exit, Layer, Option, Tracer } from 'effect'

import { ErrorReport } from './error-report'

type CloudflareSpanHandle = ReturnType<typeof tracing.startSpan>
type SpanOptions = Parameters<Tracer.Tracer['span']>[0]
type AttributeValue = string | number | boolean

/**
 * An Effect span mirrored as a Workers custom span, so `Effect.withSpan` shows up in
 * Workers › Observability › Traces next to the automatic D1/R2/fetch spans, and in any
 * OpenTelemetry destination configured for the Worker. Failed spans carry the error.
 */
class CloudflareSpan extends Tracer.NativeSpan {
  readonly handle: CloudflareSpanHandle | undefined

  constructor(options: SpanOptions) {
    super(options)
    this.handle = CloudflareSpan.start(options.name, options.parent)
  }

  override attribute(key: string, value: unknown): void {
    super.attribute(key, value)
    const converted = CloudflareSpan.toAttribute(value)
    if (converted !== undefined) this.handle?.setAttribute(key, converted)
  }

  override end(endTime: bigint, exit: Exit.Exit<unknown, unknown>): void {
    if (this.status._tag === 'Ended') return
    super.end(endTime, exit)
    const handle = this.handle
    if (!handle) return
    try {
      if (Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)) {
        const description = ErrorReport.describe(Cause.squash(exit.cause))
        const message = ErrorReport.rootMessage(description)
        handle.recordException({ name: description.tag ?? description.name, message, stack: description.stack })
        if (description.operation) handle.setAttribute('error.operation', description.operation)
        handle.setStatus({ code: 'error', message })
      } else if (Exit.isSuccess(exit)) {
        handle.setStatus({ code: 'ok' })
      }
    } finally {
      handle.end()
    }
  }

  /** Nest under the parent's Workers span; with no parent, under the request's root span. */
  private static start(name: string, parent: Option.Option<Tracer.AnySpan>): CloudflareSpanHandle | undefined {
    try {
      const parentHandle = Option.getOrUndefined(parent)
      if (parentHandle instanceof CloudflareSpan && parentHandle.handle) {
        return tracing.withActiveSpan(parentHandle.handle, () => tracing.startSpan(name))
      }
      return tracing.startSpan(name)
    } catch {
      // Outside a request (module scope) there is nothing to attach to; Effect still tracks the span.
      return undefined
    }
  }

  private static toAttribute(value: unknown): AttributeValue | undefined {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
    if (value === undefined || value === null) return undefined
    try {
      return JSON.stringify(ErrorReport.redact(value))
    } catch {
      return String(value)
    }
  }
}

export class CloudflareTracer {
  static readonly tracer = Tracer.make({
    span: (options) => new CloudflareSpan(options),
  })

  /** Uses Workers tracing when the runtime has it; otherwise keeps Effect's default tracer. */
  static readonly layer: Layer.Layer<never> =
    typeof tracing?.startSpan === 'function' ? Layer.succeed(Tracer.Tracer, CloudflareTracer.tracer) : Layer.empty
}
