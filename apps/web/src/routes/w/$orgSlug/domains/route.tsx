import { createFileRoute, Outlet } from '@tanstack/react-router'
import { DomainsWorkspaceProvider } from '#/contexts/DomainsWorkspaceContext'

export const Route = createFileRoute('/w/$orgSlug/domains')({
  component: DomainsLayout,
})

function DomainsLayout() {
  return (
    <DomainsWorkspaceProvider>
      <Outlet />
    </DomainsWorkspaceProvider>
  )
}
