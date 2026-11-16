import { createFileRoute, redirect } from '@tanstack/react-router'

/** Old name of the API keys page. */
export const Route = createFileRoute('/settings/developers')({
  beforeLoad: () => {
    throw redirect({ to: '/settings/api-keys', replace: true })
  },
})
