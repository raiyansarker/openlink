import { createFileRoute } from '@tanstack/react-router'
import GeneralSettingsFields from '#/components/settings/GeneralSettingsFields'
import SettingsPageHeader from '#/components/settings/SettingsPageHeader'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/settings/_workspace/general')({
  head: createPageHead('General', 'Settings'),
  component: () => (
    <>
      <SettingsPageHeader title="General" description="Name, URL, and workspace controls" />
      <GeneralSettingsFields />
    </>
  ),
})
