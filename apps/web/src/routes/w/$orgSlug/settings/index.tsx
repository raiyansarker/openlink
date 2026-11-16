import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/w/$orgSlug/settings/')({
  beforeLoad: () => {
    throw redirect({ to: '/settings/profile', replace: true })
  },
})
