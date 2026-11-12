import { useEffect, useState } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Button } from '@astryxdesign/core/Button'
import { Divider } from '@astryxdesign/core/Divider'
import { Drawer, DrawerHeader } from '@astryxdesign/core/Drawer'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import CopyValueButton from '#/components/common/CopyValueButton'
import ApiKeySecretField from '#/components/settings/ApiKeySecretField'
import WebhookEventSwitches from '#/components/settings/WebhookEventSwitches'
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
        width={440}
        hasScrim
        padding={FLOATING_END_DRAWER_PADDING}
        style={floatingEndDrawerStyle()}
      >
        <Layout
          header={
            <DrawerHeader
              title={webhook.name}
              subtitle={
                <HStack gap={2} vAlign="center">
                  <StatusDot variant={meta.dotVariant} label={meta.label} />
                  <Text type="supporting" color="secondary">
                    {meta.label} · {meta.description}
                  </Text>
                </HStack>
              }
              onOpenChange={onOpenChange}
            />
          }
          content={
            <LayoutContent>
              <VStack gap={8} width="100%" hAlign="stretch">
                <MetadataList label={{ position: 'top' }}>
                  <MetadataListItem label="Endpoint">
                    <CopyValueButton display={webhook.endpointUrl} />
                  </MetadataListItem>
                  <MetadataListItem label="Signing secret">
                    <HStack gap={3} vAlign="center" hAlign="between" width="100%">
                      <Text color="secondary">
                        Hidden · only shown when created or rolled
                      </Text>
                      <Button
                        variant="secondary"
                        size="sm"
                        label="Roll secret"
                        onClick={() => setRollAlertOpen(true)}
                      />
                    </HStack>
                  </MetadataListItem>
                </MetadataList>

                {newSecret ? (
                  <ApiKeySecretField
                    label="New signing secret"
                    value={newSecret}
                    description="Shown once. Update your server before closing."
                  />
                ) : null}

                <Divider variant="subtle" />

                <VStack gap={3} width="100%" hAlign="stretch">
                  <VStack gap={1} hAlign="start">
                    <Heading level={4}>Events</Heading>
                    <Text type="supporting" color="secondary">
                      Changes apply right away.
                    </Text>
                  </VStack>
                  <WebhookEventSwitches
                    value={webhook.events}
                    onChange={(next: WebhookEvent[]) =>
                      onUpdate(webhook.id, { events: next })
                    }
                  />
                </VStack>
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
