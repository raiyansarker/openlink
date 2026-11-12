import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { runHealthChecks } from '#/server/health/checks'
import { healthHttpStatus } from '#/server/health/report'

export const Route = createFileRoute('/api/v1/health')({
  server: {
    handlers: {
      GET: async () => {
        const report = await runHealthChecks()
        const httpStatus = healthHttpStatus(report.status)
        return json(report, { status: httpStatus })
      },
    },
  },
})
