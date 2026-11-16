import { createFileRoute } from '@tanstack/react-router'
import ApiKeysSettingsFields from '#/components/settings/ApiKeysSettingsFields'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/settings/_workspace/api-keys')({
  head: createPageHead('API keys', 'Settings'),
  component: ApiKeysSettingsFields,
})
