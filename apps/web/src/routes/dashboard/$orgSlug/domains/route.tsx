import { createFileRoute, Outlet } from '@tanstack/react-router'
import { DomainsWorkspaceProvider } from '#/contexts/DomainsWorkspaceContext'

export const Route = createFileRoute('/dashboard/$orgSlug/domains')({
  component: DomainsLayout,
})

function DomainsLayout() {
  return (
    <DomainsWorkspaceProvider>
      <Outlet />
    </DomainsWorkspaceProvider>
  )
}
