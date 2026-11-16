import { createFileRoute } from '@tanstack/react-router'
import DevicesSettingsFields from '#/components/settings/DevicesSettingsFields'
import SettingsPage from '#/components/settings/SettingsPage'
import SettingsPageHeader from '#/components/settings/SettingsPageHeader'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/settings/devices')({
  head: createPageHead('Devices', 'Settings'),
  component: () => (
    <SettingsPage>
      <SettingsPageHeader title="Devices" description="Browsers and devices where you are signed in" />
      <DevicesSettingsFields />
    </SettingsPage>
  ),
})
