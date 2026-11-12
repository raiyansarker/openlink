import { useEffect, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Drawer, DrawerHeader } from '@astryxdesign/core/Drawer'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { MultiSelector } from '@astryxdesign/core/MultiSelector'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import ApiKeySecretField from '#/components/settings/ApiKeySecretField'
import {
  FLOATING_END_DRAWER_PADDING,
  floatingEndDrawerStyle,
} from '#/components/members/floating-end-drawer'
import type { WebhookEvent, WorkspaceWebhook } from '#/data/demo/webhooks'
import { WEBHOOK_EVENT_LABELS } from '#/data/demo/webhooks'
import {
  buildFullWebhookSecret,
  randomWebhookPrefix,
} from '#/lib/integrations/webhook-secret'

const DEFAULT_EVENTS: WebhookEvent[] = ['link.created', 'link.updated']

const EVENT_OPTIONS = (Object.keys(WEBHOOK_EVENT_LABELS) as WebhookEvent[]).map(
  (event) => ({
    value: event,
    label: WEBHOOK_EVENT_LABELS[event],
  }),
)

type CreateWebhookDrawerProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (webhook: WorkspaceWebhook) => void
}

export default function CreateWebhookDrawer({
  isOpen,
  onOpenChange,
  onCreate,
}: CreateWebhookDrawerProps) {
  const [name, setName] = useState('')
  const [endpointUrl, setEndpointUrl] = useState('')
  const [events, setEvents] = useState<WebhookEvent[]>(DEFAULT_EVENTS)
  const [signingSecret, setSigningSecret] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setName('')
      setEndpointUrl('')
      setEvents(DEFAULT_EVENTS)
      setSigningSecret(null)
    }
  }, [isOpen])

  const revealMode = signingSecret != null

  const handleCreate = () => {
    const trimmedName = name.trim()
    const trimmedUrl = endpointUrl.trim()
    if (!trimmedName || !trimmedUrl || events.length === 0) return
    const prefix = randomWebhookPrefix()
    const secret = buildFullWebhookSecret(prefix)
    const webhook: WorkspaceWebhook = {
      id: `wh_${Date.now()}`,
      name: trimmedName,
      endpointUrl: trimmedUrl,
      events: [...events],
      isEnabled: true,
      signingSecretPrefix: prefix,
      lastDeliveryAt: null,
      lastDeliveryStatus: null,
    }
    setSigningSecret(secret)
    onCreate(webhook)
  }

  const canSubmit =
    name.trim().length > 0 &&
    endpointUrl.trim().length > 0 &&
    events.length > 0

  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      label="Add webhook"
      side="end"
      width={400}
      purpose="form"
      padding={FLOATING_END_DRAWER_PADDING}
      style={floatingEndDrawerStyle()}
    >
      <Layout
        header={
          <DrawerHeader
            title={revealMode ? 'Save signing secret' : 'Add webhook'}
            subtitle={
              revealMode
                ? 'Verify payloads with this secret.'
                : 'Send events to your server over HTTPS.'
            }
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            {revealMode ? (
              <VStack gap={4} hAlign="stretch" width="100%">
                <Text color="secondary" type="supporting">
                  Copy the signing secret now. You will not see it again after you
                  close this panel.
                </Text>
                <ApiKeySecretField label="Signing secret" value={signingSecret ?? ''} />
              </VStack>
            ) : (
              <VStack gap={5} hAlign="stretch" width="100%">
                <TextInput
                  label="Name"
                  placeholder="e.g. Production alerts"
                  value={name}
                  onChange={setName}
                  description="Shown in your webhook list."
                  isRequired
                  hasAutoFocus
                  width="100%"
                />
                <TextInput
                  label="Endpoint URL"
                  placeholder="https://example.com/webhooks/openlink"
                  value={endpointUrl}
                  onChange={setEndpointUrl}
                  description="Must be HTTPS."
                  isRequired
                  width="100%"
                />
                <MultiSelector
                  label="Events"
                  options={EVENT_OPTIONS}
                  value={events}
                  onChange={(next) => setEvents(next as WebhookEvent[])}
                  description="Only selected events are sent."
                  width="100%"
                />
              </VStack>
            )}
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={2} hAlign="end" width="100%" wrap="wrap">
              {revealMode ? (
                <Button
                  variant="primary"
                  size="sm"
                  label="Done"
                  onClick={() => onOpenChange(false)}
                />
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    label="Cancel"
                    onClick={() => onOpenChange(false)}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    label="Add webhook"
                    isDisabled={!canSubmit}
                    onClick={handleCreate}
                  />
                </>
              )}
            </HStack>
          </LayoutFooter>
        }
      />
    </Drawer>
  )
}
