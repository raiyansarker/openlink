import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AuthSession } from '#/lib/auth/client'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: ({ location }) => AuthSession.requireSignedIn(location),
  component: () => <Outlet />,
})
