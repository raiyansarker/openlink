import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/$orgId/links')({
  component: DashboardLinksPage,
})

function DashboardLinksPage() {
  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Links</h1>
    </div>
  )
}
