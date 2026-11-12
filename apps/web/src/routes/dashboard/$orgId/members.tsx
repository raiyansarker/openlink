import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/$orgId/members')({
  component: DashboardMembersPage,
})

function DashboardMembersPage() {
  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Members</h1>
    </div>
  )
}
