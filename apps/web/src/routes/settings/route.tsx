import { createFileRoute, Outlet } from '@tanstack/react-router'
import { WorkspaceDirectoryProvider } from '#/contexts/WorkspaceDirectoryContext'
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
    // Personal sections need no workspace; workspace sections add their own (see SettingsSectionPanel).
    <WorkspaceDirectoryProvider>
      <SettingsShell>
        <Outlet />
      </SettingsShell>
    </WorkspaceDirectoryProvider>
  )
}
