import { createFileRoute, redirect } from '@tanstack/react-router'

/** Old name of the Devices page. */
export const Route = createFileRoute('/settings/accounts')({
  beforeLoad: () => {
    throw redirect({ to: '/settings/devices', replace: true })
  },
})
