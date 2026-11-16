import { createFileRoute, Outlet } from '@tanstack/react-router'
import SettingsPage from '#/components/settings/SettingsPage'
import { OrganizationProvider } from '#/contexts/OrganizationContext'

/** Workspace settings run inside the active workspace; personal ones do not need one. */
export const Route = createFileRoute('/settings/_workspace')({
  component: () => (
    <SettingsPage>
      <OrganizationProvider presentation="inline">
        <Outlet />
      </OrganizationProvider>
    </SettingsPage>
  ),
})
