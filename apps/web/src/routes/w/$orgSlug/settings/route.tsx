import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/w/$orgSlug/settings')({
  component: () => <Outlet />,
})
