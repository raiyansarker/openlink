import { createFileRoute } from '@tanstack/react-router'
import AppearanceSettingsFields from '#/components/settings/AppearanceSettingsFields'
import SettingsPage from '#/components/settings/SettingsPage'
import SettingsPageHeader from '#/components/settings/SettingsPageHeader'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/settings/appearance')({
  head: createPageHead('Appearance', 'Settings'),
  component: () => (
    <SettingsPage>
      <SettingsPageHeader title="Appearance" description="Choose how Openlink looks on this device." />
      <AppearanceSettingsFields />
    </SettingsPage>
  ),
})
