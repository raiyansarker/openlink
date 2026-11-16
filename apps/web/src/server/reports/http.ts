import { ORPCError } from '@orpc/server'
import { ReportQuery } from '@openlink/contracts'
import { type } from 'arktype'
import { Effect } from 'effect'

import { requireOrgMemberEffect } from '../effect/access'
import { effectRuntime } from '../effect/runtime'
import { WorkerRequest } from '../effect/services/request'
import { Reports } from './service'

const ExportQuery = ReportQuery.and({ kind: "'clicks' | 'links'" })

/**
 * CSV downloads for Reports, outside the JSON API so a large month comes back
 * as a file. Same access as the reports API: any member of the workspace.
 */
export class ReportExportHttp {
  private static readonly STATUS: Record<string, number> = { UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404 }

  static handle(request: Request, organizationId: string): Promise<Response> {
    const parsed = ExportQuery(Object.fromEntries(new URL(request.url).searchParams))
    if (parsed instanceof type.errors) {
      return Promise.resolve(Response.json({ message: parsed.summary }, { status: 400, headers: { 'cache-control': 'no-store' } }))
    }
    const { kind, month, campaign, tzOffset = 0 } = parsed
    const query = { organizationId, month, tzOffsetMinutes: tzOffset, ...(campaign ? { campaign } : {}) }

    const effect = Effect.gen(function* () {
      yield* requireOrgMemberEffect(organizationId)
      const csv = yield* (kind === 'clicks' ? Reports.clicksCsv(query) : Reports.linksCsv(query))
      return new Response(csv, {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="${ReportExportHttp.fileName(kind, month, campaign)}"`,
          'cache-control': 'no-store',
        },
      })
    }).pipe(
      Effect.catch((error: unknown) => {
        if (error instanceof ORPCError) {
          const status = ReportExportHttp.STATUS[error.code] ?? 400
          return Effect.succeed(Response.json({ message: error.message }, { status, headers: { 'cache-control': 'no-store' } }))
        }
        return Effect.logError(`report export failed: ${String(error)}`).pipe(
          Effect.as(Response.json({ message: 'The export failed. Please try again.' }, { status: 500 })),
        )
      }),
      Effect.provideService(WorkerRequest, request),
    )
    return effectRuntime.runPromise(effect)
  }

  /** e.g. "openlink-clicks-2026-11-spring-launch.csv"; only safe characters. */
  static fileName(kind: 'clicks' | 'links', month: string, campaign?: string): string {
    const slug = campaign?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
    return `openlink-${kind}-${month}${slug ? `-${slug}` : ''}.csv`
  }
}
