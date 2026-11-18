import { createFileRoute } from '@tanstack/react-router'
import { Cause, Exit } from 'effect'
import { effectRuntime } from '#/server/effect/runtime'
import { ErrorReport } from '#/server/observability'
import { TraceTest, type TraceTestKind } from '#/server/observability/trace-test'

/**
 * Temporary tracing check, open to anyone. Remove this route once tracing is verified.
 *
 *   curl "https://<host>/api/debug/trace-test?kind=nested"
 *
 * `kind` is ok, typed, defect, operation or nested; without it every kind runs in one request.
 * The response includes the trace id to look up in Workers › Observability › Traces.
 */
const serve = async ({ request }: { request: Request }) => {
  const requested = new URL(request.url).searchParams.get('kind')
  if (requested !== null && !TraceTest.isKind(requested)) {
    return Response.json({ error: `kind must be one of: ${TraceTest.KINDS.join(', ')}` }, { status: 400 })
  }

  const kinds: readonly TraceTestKind[] = requested ? [requested] : TraceTest.KINDS
  const results = await Promise.all(
    kinds.map(async (kind) => {
      const exit = await effectRuntime.runPromiseExit(TraceTest.run(kind))
      return Exit.isSuccess(exit)
        ? { kind, ok: true as const, message: exit.value }
        : { kind, ok: false as const, error: ErrorReport.describe(Cause.squash(exit.cause)) }
    }),
  )

  const failed = results.some((result) => !result.ok)
  return Response.json(
    { traceId: TraceTest.traceId(), results },
    { status: failed ? 500 : 200, headers: { 'cache-control': 'no-store' } },
  )
}

export const Route = createFileRoute('/api/debug/trace-test')({
  server: { handlers: { GET: serve } },
})
