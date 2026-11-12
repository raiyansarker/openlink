import { createFileRoute } from '@tanstack/react-router'
import { useOrganization } from '#/contexts/OrganizationContext'

export const Route = createFileRoute('/dashboard/$orgId/')({
  component: DashboardOverview,
})

function DashboardOverview() {
  const { activeOrg } = useOrganization()

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 600 }}>
        {activeOrg.name}
      </h1>
      <p style={{ margin: 0, color: '#5c6370' }}>
        Dashboard UI cleared — ready to rebuild from scratch.
      </p>
    </div>
  )
}
