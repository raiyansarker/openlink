import { type ReactNode, useEffect, useState } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Button } from '@astryxdesign/core/Button'
import { Divider } from '@astryxdesign/core/Divider'
import { Drawer, DrawerHeader } from '@astryxdesign/core/Drawer'
import { InputGroup } from '@astryxdesign/core/InputGroup'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { StatusDot } from '@astryxdesign/core/StatusDot'
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
  buildFullWebhookSecret,
  randomWebhookPrefix,
} from '#/lib/integrations/webhook-secret'
import { webhookStatusMeta } from '#/lib/integrations/webhook-status'

type WebhookDetailSheetProps = {
  webhook: WorkspaceWebhook | null
  onOpenChange: (open: boolean) => void
  onUpdate: (id: string, patch: Partial<WorkspaceWebhook>) => void
  onRemove: (id: string) => void
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Label/value row, same pattern as the member detail drawer. */
function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <HStack hAlign="between" vAlign="center" gap={4} width="100%">
      <Text type="supporting" color="secondary">
        {label}
      </Text>
      {children}
    </HStack>
  )
}

export default function WebhookDetailSheet({
  webhook,
  onOpenChange,
  onUpdate,
  onRemove,
}: WebhookDetailSheetProps) {
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [rollAlertOpen, setRollAlertOpen] = useState(false)
  const [newSecret, setNewSecret] = useState<string | null>(null)

  const webhookId = webhook?.id
  useEffect(() => {
    setNewSecret(null)
  }, [webhookId])

  if (!webhook) return null

  const meta = webhookStatusMeta(webhook)

  const rollSecret = () => {
    const prefix = randomWebhookPrefix()
    setNewSecret(buildFullWebhookSecret(prefix))
    onUpdate(webhook.id, { signingSecretPrefix: prefix })
    setRollAlertOpen(false)
  }

  return (
    <>
      <Drawer
        isOpen
        onOpenChange={onOpenChange}
        label={webhook.name}
        side="end"
        width={420}
        hasScrim
        padding={FLOATING_END_DRAWER_PADDING}
        style={floatingEndDrawerStyle()}
      >
        <Layout
          header={
            <DrawerHeader
              title={webhook.name}
              subtitle="Webhook endpoint"
              onOpenChange={onOpenChange}
            />
          }
          content={
            <LayoutContent>
              <VStack gap={6} width="100%" hAlign="stretch">
                <VStack gap={3} width="100%" hAlign="stretch">
                  <DetailRow label="Status">
                    <HStack gap={2} vAlign="center">
                      <StatusDot variant={meta.dotVariant} label={meta.label} />
                      <Text type="supporting" weight="medium">
                        {meta.label}
                      </Text>
                    </HStack>
                  </DetailRow>
                  <DetailRow label="Last delivery">
                    <Text type="supporting">
                      {webhook.lastDeliveryAt
                        ? formatDateTime(webhook.lastDeliveryAt)
                        : 'Never'}
                    </Text>
                  </DetailRow>
                  {webhook.lastDeliveryStatus === 'failure' && webhook.isEnabled ? (
                    <Text type="supporting" color="secondary">
                      {meta.description} Check that the endpoint returns a 2xx
                      response.
                    </Text>
                  ) : null}
                </VStack>

                <Divider variant="subtle" />

                <TextInput
                  label="Endpoint URL"
                  size="sm"
                  value={webhook.endpointUrl}
                  onChange={() => {}}
                  isDisabled
                  disabledMessage="Create a new webhook to send events to a different URL."
                  width="100%"
                />

                <WebhookEventsSelector
                  value={webhook.events}
                  onChange={(next: WebhookEvent[]) => {
                    if (next.length > 0) onUpdate(webhook.id, { events: next })
                  }}
                  description="Changes apply right away."
                />

                <InputGroup
                  label="Signing secret"
                  description="Only shown when created or rolled."
                  size="sm"
                >
                  <TextInput
                    label="Signing secret"
                    isLabelHidden
                    size="sm"
                    value="••••••••••••••••••••••••"
                    onChange={() => {}}
                    isDisabled
                    width="100%"
                    controlStyle={{ flex: '1 1 0', minWidth: 0 }}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    label="Roll secret"
                    onClick={() => setRollAlertOpen(true)}
                  />
                </InputGroup>

                {newSecret ? (
                  <ApiKeySecretField
                    label="New signing secret"
                    value={newSecret}
                    description="Shown once. Update your server before closing."
                  />
                ) : null}
              </VStack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <HStack gap={2} hAlign="between" width="100%">
                <Button
                  variant="ghost"
                  size="sm"
                  label="Delete endpoint"
                  onClick={() => setDeleteAlertOpen(true)}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  label={webhook.isEnabled ? 'Pause deliveries' : 'Resume deliveries'}
                  onClick={() =>
                    onUpdate(webhook.id, { isEnabled: !webhook.isEnabled })
                  }
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Drawer>

      <AlertDialog
        isOpen={rollAlertOpen}
        onOpenChange={setRollAlertOpen}
        title="Roll signing secret?"
        description="The current secret stops working immediately. Requests your server receives will be signed with the new one."
        actionLabel="Roll secret"
        onAction={rollSecret}
      />

      <AlertDialog
        isOpen={deleteAlertOpen}
        onOpenChange={setDeleteAlertOpen}
        title={`Delete ${webhook.name}?`}
        description="Deliveries to this URL will stop immediately. You cannot undo this action."
        actionLabel="Delete endpoint"
        onAction={() => {
          onRemove(webhook.id)
          setDeleteAlertOpen(false)
          onOpenChange(false)
        }}
      />
    </>
  )
}
