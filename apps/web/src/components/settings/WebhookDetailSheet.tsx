import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Button } from '@astryxdesign/core/Button'
import { Divider } from '@astryxdesign/core/Divider'
import { Drawer, DrawerHeader } from '@astryxdesign/core/Drawer'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { useState } from 'react'
import CopyValueButton from '#/components/common/CopyValueButton'
import RouteRail from '#/components/common/RouteRail'
import {
  FLOATING_END_DRAWER_PADDING,
  floatingEndDrawerStyle,
} from '#/components/members/floating-end-drawer'
import type { WorkspaceWebhook } from '#/data/demo/webhooks'
import { WEBHOOK_EVENT_LABELS } from '#/data/demo/webhooks'
import { webhookStatusMeta } from '#/lib/integrations/webhook-status'

type WebhookDetailSheetProps = {
  webhook: WorkspaceWebhook | null
  onOpenChange: (open: boolean) => void
  onToggleEnabled: (id: string, enabled: boolean) => void
  onRemove: (id: string) => void
}

export default function WebhookDetailSheet({
  webhook,
  onOpenChange,
  onToggleEnabled,
  onRemove,
}: WebhookDetailSheetProps) {
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)

  if (!webhook) return null

  const meta = webhookStatusMeta(webhook)

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
          header={<DrawerHeader title={webhook.name} onOpenChange={onOpenChange} />}
          content={
            <LayoutContent>
              <VStack gap={6} width="100%" hAlign="stretch">
                <VStack gap={1} width="100%" hAlign="stretch">
                  <HStack gap={2} vAlign="center">
                    <StatusDot variant={meta.dotVariant} label={meta.label} />
                    <Text weight="semibold">{meta.label}</Text>
                  </HStack>
                  <Text type="supporting" color="secondary">
                    {meta.description}
                  </Text>
                </VStack>

                <VStack gap={3} width="100%" hAlign="stretch">
                  <VStack gap={1} width="100%" hAlign="stretch">
                    <Heading level={4}>Delivery</Heading>
                    <Text type="supporting" color="secondary">
                      Click a value to copy it.
                    </Text>
                  </VStack>
                  <HStack gap={3} vAlign="stretch" width="100%">
                    <RouteRail />
                    <VStack gap={3} hAlign="start" width="100%">
                      <VStack gap={1} hAlign="start">
                        <Text type="supporting" color="secondary">
                          OpenLink sends POST requests to
                        </Text>
                        <CopyValueButton display={webhook.endpointUrl} />
                      </VStack>
                      <VStack gap={1} hAlign="start">
                        <Text type="supporting" color="secondary">
                          Signed with a secret starting
                        </Text>
                        <CopyValueButton display={webhook.signingSecretPrefix} />
                      </VStack>
                    </VStack>
                  </HStack>
                </VStack>

                <Divider variant="subtle" />

                <VStack gap={2} width="100%" hAlign="stretch">
                  <Heading level={4}>Events</Heading>
                  {webhook.events.map((event) => (
                    <Text key={event}>{WEBHOOK_EVENT_LABELS[event]}</Text>
                  ))}
                </VStack>
              </VStack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <HStack gap={2} hAlign="between" width="100%" wrap="wrap">
                <Button
                  variant="destructive"
                  size="sm"
                  label="Delete endpoint"
                  onClick={() => setDeleteAlertOpen(true)}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  label={webhook.isEnabled ? 'Disable' : 'Enable'}
                  onClick={() => onToggleEnabled(webhook.id, !webhook.isEnabled)}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Drawer>

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
