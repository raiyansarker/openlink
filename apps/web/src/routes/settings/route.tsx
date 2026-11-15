import { createFileRoute, Outlet } from '@tanstack/react-router'
import { OrganizationProvider } from '#/contexts/OrganizationContext'
import SettingsShell from '#/components/settings/SettingsShell'
import { AuthSession } from '#/lib/auth/client'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/settings')({
  beforeLoad: ({ location }) => AuthSession.requireSignedIn(location),
  head: createPageHead('Settings'),
  component: SettingsLayout,
})

function SettingsLayout() {
  return (
    <OrganizationProvider>
      <SettingsShell>
        <Outlet />
      </SettingsShell>
    </OrganizationProvider>
  )
}
