import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { runHealthChecks } from '#/server/health/checks'

export const Route = createFileRoute('/api/v1/health')({
  server: {
    handlers: {
      GET: async () => {
        const report = await runHealthChecks()
        const httpStatus = report.status === 'error' ? 503 : 200
        return json(report, { status: httpStatus })
      },
    },
  },
})
