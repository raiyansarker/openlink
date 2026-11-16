import { createFileRoute } from '@tanstack/react-router'
import ProfileSettingsFields from '#/components/settings/ProfileSettingsFields'
import SettingsPage from '#/components/settings/SettingsPage'
import SettingsPageHeader from '#/components/settings/SettingsPageHeader'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/settings/profile')({
  head: createPageHead('Profile', 'Settings'),
  component: () => (
    <SettingsPage>
      <SettingsPageHeader title="Profile" />
      <ProfileSettingsFields />
    </SettingsPage>
  ),
})
