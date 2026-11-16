import { createFileRoute } from '@tanstack/react-router'
import MembersSettingsFields from '#/components/settings/MembersSettingsFields'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/settings/_workspace/members')({
  head: createPageHead('Members', 'Settings'),
  component: MembersSettingsFields,
})
