import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/$orgSlug/settings')({
  component: () => <Outlet />,
})
