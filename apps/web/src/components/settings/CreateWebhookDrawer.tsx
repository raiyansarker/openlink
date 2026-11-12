import { useEffect, useMemo, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { CodeBlock } from '@astryxdesign/core/CodeBlock'
import { Drawer, DrawerHeader } from '@astryxdesign/core/Drawer'
import { HStack } from '@astryxdesign/core/HStack'
import { InputGroup, InputGroupText } from '@astryxdesign/core/InputGroup'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import ApiKeySecretField from '#/components/settings/ApiKeySecretField'
import WebhookEventsSelector from '#/components/settings/WebhookEventsSelector'
import {
  FLOATING_END_DRAWER_PADDING,
  floatingEndDrawerStyle,
} from '#/components/members/floating-end-drawer'
import type { WebhookEvent, WorkspaceWebhook } from '#/data/demo/webhooks'
import {
  checkEndpoint,
  sampleWebhookPayload,
  stripScheme,
} from '#/lib/integrations/webhook-payload'
import {
  buildFullWebhookSecret,
  randomWebhookPrefix,
} from '#/lib/integrations/webhook-secret'

const DEFAULT_EVENTS: WebhookEvent[] = ['link.created', 'link.updated']

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
  const [hostAndPath, setHostAndPath] = useState('')
  const [name, setName] = useState('')
  const [events, setEvents] = useState<WebhookEvent[]>(DEFAULT_EVENTS)
  const [isTouched, setIsTouched] = useState(false)
  const [signingSecret, setSigningSecret] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setHostAndPath('')
    setName('')
    setEvents(DEFAULT_EVENTS)
    setIsTouched(false)
    setSigningSecret(null)
  }, [isOpen])

  const endpoint = useMemo(() => checkEndpoint(hostAndPath), [hostAndPath])
  const urlStatus =
    isTouched && hostAndPath.length > 0 && !endpoint.ok
      ? { type: 'error' as const, message: endpoint.message }
      : undefined
  const previewEvent = events[0] ?? 'link.created'
  const isRevealStep = signingSecret != null

  const handleCreate = () => {
    if (!endpoint.ok) {
      setIsTouched(true)
      return
    }
    const prefix = randomWebhookPrefix()
    setSigningSecret(buildFullWebhookSecret(prefix))
    onCreate({
      id: `wh_${Date.now()}`,
      name: name.trim() || endpoint.hostname,
      endpointUrl: endpoint.url,
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
            title={isRevealStep ? 'Webhook added' : 'Add webhook'}
            subtitle={
              isRevealStep
                ? 'One last step: save the signing secret.'
                : 'OpenLink will POST signed JSON to your endpoint.'
            }
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            {isRevealStep ? (
              <VStack gap={4} hAlign="stretch" width="100%">
                <ApiKeySecretField
                  label="Signing secret"
                  value={signingSecret ?? ''}
                  description="Shown once. Store it in your server's environment."
                />
                <Text type="supporting" color="secondary">
                  Use it to check the OpenLink-Signature header on each request.
                  If you lose it, roll a new one from the webhook's details.
                </Text>
              </VStack>
            ) : (
              <VStack gap={6} hAlign="stretch" width="100%">
                <VStack gap={4} hAlign="stretch" width="100%">
                  <InputGroup
                    label="Endpoint URL"
                    isRequired
                    size="sm"
                    status={urlStatus}
                  >
                    <InputGroupText>https://</InputGroupText>
                    <TextInput
                      label="Endpoint URL"
                      isLabelHidden
                      size="sm"
                      type="url"
                      placeholder="hooks.example.com/openlink"
                      value={hostAndPath}
                      onChange={(next) => setHostAndPath(stripScheme(next))}
                      onBlur={() => setIsTouched(true)}
                      hasAutoFocus
                      width="100%"
                      controlStyle={{ flex: '1 1 0', minWidth: 0 }}
                    />
                  </InputGroup>
                  <TextInput
                    label="Name"
                    isOptional
                    size="sm"
                    placeholder={endpoint.ok ? endpoint.hostname : 'Production alerts'}
                    value={name}
                    onChange={setName}
                    width="100%"
                  />
                </VStack>

                <WebhookEventsSelector
                  value={events}
                  onChange={setEvents}
                  isRequired
                />

                <VStack gap={2} hAlign="stretch" width="100%">
                  <HStack gap={2} hAlign="between" vAlign="center" width="100%">
                    <Text type="supporting" weight="semibold">
                      Example payload
                    </Text>
                    <Text type="supporting" color="secondary">
                      {previewEvent}
                    </Text>
                  </HStack>
                  <CodeBlock
                    language="json"
                    code={sampleWebhookPayload(previewEvent)}
                    size="sm"
                    width="100%"
                    hasLanguageLabel={false}
                    hasCopyButton={false}
                  />
                </VStack>
              </VStack>
            )}
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={2} hAlign="end" width="100%">
              {isRevealStep ? (
                <Button
                  variant="primary"
                  size="sm"
                  label="I've saved it"
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
                    isDisabled={!endpoint.ok || events.length === 0}
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
