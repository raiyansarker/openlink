import { useEffect, useMemo, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { CheckboxList, CheckboxListItem } from '@astryxdesign/core/CheckboxList'
import { Drawer, DrawerHeader } from '@astryxdesign/core/Drawer'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import ApiKeySecretField from '#/components/settings/ApiKeySecretField'
import {
  FLOATING_END_DRAWER_PADDING,
  floatingEndDrawerStyle,
} from '#/components/members/floating-end-drawer'
import type { WebhookEvent, WorkspaceWebhook } from '#/data/demo/webhooks'
import {
  WEBHOOK_EVENT_DESCRIPTIONS,
  WEBHOOK_EVENT_LABELS,
} from '#/data/demo/webhooks'
import {
  buildFullWebhookSecret,
  randomWebhookPrefix,
} from '#/lib/integrations/webhook-secret'

const DEFAULT_EVENTS: WebhookEvent[] = ['link.created', 'link.updated']
const ALL_EVENTS = Object.keys(WEBHOOK_EVENT_LABELS) as WebhookEvent[]

type EndpointCheck =
  | { ok: true; hostname: string }
  | { ok: false; message: string }

function checkEndpoint(raw: string): EndpointCheck {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return { ok: false, message: 'Enter a full URL, like https://example.com/hook.' }
  }
  if (url.protocol !== 'https:') {
    return { ok: false, message: 'The URL must start with https://.' }
  }
  return { ok: true, hostname: url.hostname }
}

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
  const [endpointUrl, setEndpointUrl] = useState('')
  const [name, setName] = useState('')
  const [events, setEvents] = useState<WebhookEvent[]>(DEFAULT_EVENTS)
  const [touched, setTouched] = useState(false)
  const [signingSecret, setSigningSecret] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setEndpointUrl('')
      setName('')
      setEvents(DEFAULT_EVENTS)
      setTouched(false)
      setSigningSecret(null)
    }
  }, [isOpen])

  const endpoint = useMemo(() => checkEndpoint(endpointUrl), [endpointUrl])
  const showUrlError = touched && endpointUrl.trim().length > 0 && !endpoint.ok
  const canSubmit = endpoint.ok && events.length > 0
  const revealMode = signingSecret != null

  const handleCreate = () => {
    if (!endpoint.ok || events.length === 0) return
    const prefix = randomWebhookPrefix()
    const secret = buildFullWebhookSecret(prefix)
    setSigningSecret(secret)
    onCreate({
      id: `wh_${Date.now()}`,
      name: name.trim() || endpoint.hostname,
      endpointUrl: endpointUrl.trim(),
      events: [...events],
      isEnabled: true,
      signingSecretPrefix: prefix,
      lastDeliveryAt: null,
      lastDeliveryStatus: null,
    })
  }

  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      label="Add webhook"
      side="end"
      width={420}
      purpose="form"
      padding={FLOATING_END_DRAWER_PADDING}
      style={floatingEndDrawerStyle()}
    >
      <Layout
        header={
          <DrawerHeader
            title={revealMode ? 'Save your signing secret' : 'Add webhook'}
            subtitle={
              revealMode
                ? 'Use it to verify that events really come from OpenLink.'
                : 'We will POST signed events to your server.'
            }
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            {revealMode ? (
              <VStack gap={4} hAlign="stretch" width="100%">
                <ApiKeySecretField
                  label="Signing secret"
                  value={signingSecret ?? ''}
                />
                <Text type="supporting" color="secondary">
                  This is the only time the full secret is shown. Copy it before
                  you close this panel.
                </Text>
              </VStack>
            ) : (
              <VStack gap={6} hAlign="stretch" width="100%">
                <TextInput
                  label="Endpoint URL"
                  type="url"
                  placeholder="https://example.com/webhooks/openlink"
                  value={endpointUrl}
                  onChange={setEndpointUrl}
                  onBlur={() => setTouched(true)}
                  status={
                    showUrlError && !endpoint.ok
                      ? { type: 'error', message: endpoint.message }
                      : undefined
                  }
                  isRequired
                  hasAutoFocus
                  width="100%"
                />
                <TextInput
                  label="Name"
                  placeholder={endpoint.ok ? endpoint.hostname : 'Defaults to the host'}
                  value={name}
                  onChange={setName}
                  isOptional
                  width="100%"
                />
                <CheckboxList
                  label="Events"
                  description="Only the events you tick are sent."
                  value={events}
                  onChange={(next) => setEvents(next as WebhookEvent[])}
                  density="compact"
                  hasDividers
                  isRequired
                >
                  {ALL_EVENTS.map((event) => (
                    <CheckboxListItem
                      key={event}
                      value={event}
                      label={WEBHOOK_EVENT_LABELS[event]}
                      description={WEBHOOK_EVENT_DESCRIPTIONS[event]}
                    />
                  ))}
                </CheckboxList>
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
