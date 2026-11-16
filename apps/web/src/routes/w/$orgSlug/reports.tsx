import { createFileRoute } from '@tanstack/react-router'
import ReportsPanel from '#/components/reports/ReportsPanel'
import { ReportMonth } from '#/lib/reports/month'
import { createPageHead } from '#/lib/page-title'

/** `month` defaults to the viewer's current month; `campaign` to all links. */
type ReportsSearch = { month?: string; campaign?: string }

export const Route = createFileRoute('/w/$orgSlug/reports')({
  head: createPageHead('Reports'),
  // Every key is set so raw values from parent routes can't leak through.
  validateSearch: (search: Record<string, unknown>): ReportsSearch => ({
    month: ReportMonth.isValid(search.month) ? search.month : undefined,
    campaign: typeof search.campaign === 'string' && search.campaign.trim() ? search.campaign.slice(0, 200) : undefined,
  }),
  component: ReportsPage,
})

function ReportsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const month = search.month ? ReportMonth.parse(search.month) : ReportMonth.current()
  const campaign = search.campaign ?? null
  return (
    <ReportsPanel
      month={month}
      campaign={campaign}
      onChange={(change) => {
        const nextMonth = change.month ?? month
        const nextCampaign = change.campaign === undefined ? campaign : change.campaign
        void navigate({
          search: {
            month: nextMonth.key === ReportMonth.current().key ? undefined : nextMonth.key,
            campaign: nextCampaign ?? undefined,
          },
          replace: true,
          resetScroll: false,
        })
      }}
    />
  )
}
