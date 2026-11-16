import { createFileRoute } from '@tanstack/react-router'
import IntegrationsSettingsFields from '#/components/settings/IntegrationsSettingsFields'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/settings/_workspace/integrations')({
  head: createPageHead('Webhooks', 'Settings'),
  component: IntegrationsSettingsFields,
})
