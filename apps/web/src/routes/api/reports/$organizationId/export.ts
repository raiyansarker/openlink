import { createFileRoute } from '@tanstack/react-router'

import { ReportExportHttp } from '#/server/reports/http'

/** GET a month's clicks or per-link totals as CSV: `?kind=clicks|links&month=YYYY-MM[&campaign=…][&tzOffset=…]`. */
export const Route = createFileRoute('/api/reports/$organizationId/export')({
  server: {
    handlers: {
      GET: ({ request, params }) => ReportExportHttp.handle(request, params.organizationId),
    },
  },
})
