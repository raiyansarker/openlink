import { useMemo, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { CodeBlock } from '@astryxdesign/core/CodeBlock'
import ResponsiveDetailSheet from '#/components/common/ResponsiveDetailSheet'
import { HStack } from '@astryxdesign/core/HStack'
import { InputGroup, InputGroupText } from '@astryxdesign/core/InputGroup'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import ApiKeySecretField from '#/components/settings/ApiKeySecretField'
import WebhookEventsSelector from '#/components/settings/WebhookEventsSelector'
import { useOpenSession } from '#/hooks/use-open-session'
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

export default function CreateWebhookDrawer(props: CreateWebhookDrawerProps) {
  const session = useOpenSession(props.isOpen)
  // The form owns the panel: its title and footer depend on the reveal step.
  return <CreateWebhookForm key={session} {...props} />
}

function CreateWebhookForm({ isOpen, onOpenChange, onCreate }: CreateWebhookDrawerProps) {
  const [hostAndPath, setHostAndPath] = useState('')
  const [name, setName] = useState('')
  const [events, setEvents] = useState<WebhookEvent[]>(DEFAULT_EVENTS)
  const [isTouched, setIsTouched] = useState(false)
  const [signingSecret, setSigningSecret] = useState<string | null>(null)
  const [createdName, setCreatedName] = useState('')

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
    setCreatedName(name.trim() || endpoint.hostname)
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
    // Phone: a bottom sheet; desktop: the floating right-side drawer.
    <ResponsiveDetailSheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      label="Add webhook"
      title={isRevealStep ? `${createdName} is ready` : 'Add webhook'}
      subtitle={
        isRevealStep
          ? 'Save the signing secret to verify requests.'
          : 'OpenLink will POST signed JSON to your endpoint.'
      }
      width={420}
      purpose="form"
      hasFooterDivider
      footer={
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
      }
    >
      <div>
            {isRevealStep ? (
              <ApiKeySecretField
                label="Signing secret"
                value={signingSecret ?? ''}
                description="Shown only once. Lost it? Roll a new one from the table."
              />
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
      </div>
    </ResponsiveDetailSheet>
  )
}
