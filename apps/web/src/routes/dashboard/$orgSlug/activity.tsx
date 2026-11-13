import { createFileRoute } from '@tanstack/react-router'
import DashboardActivityPanel from '#/components/activity/DashboardActivityPanel'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/dashboard/$orgSlug/activity')({
  head: createPageHead('Activity'),
  component: DashboardActivityPage,
})

function DashboardActivityPage() {
  return <DashboardActivityPanel />
}
