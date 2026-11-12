import { createFileRoute, Outlet } from '@tanstack/react-router'
import { OrganizationProvider } from '#/contexts/OrganizationContext'
import SettingsShell from '#/components/settings/SettingsShell'
import { getDefaultOrgSlug } from '#/lib/dashboard/org-slug'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/settings')({
  head: createPageHead('Settings'),
  component: SettingsLayout,
})

function SettingsLayout() {
  const orgSlug = getDefaultOrgSlug()
  return (
    <OrganizationProvider orgSlugFromRoute={orgSlug}>
      <SettingsShell>
        <Outlet />
      </SettingsShell>
    </OrganizationProvider>
  )
}
