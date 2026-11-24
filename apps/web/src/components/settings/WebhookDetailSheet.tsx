import { type ReactNode, useState } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Button } from '@astryxdesign/core/Button'
import { Divider } from '@astryxdesign/core/Divider'
import ResponsiveDetailSheet from '#/components/common/ResponsiveDetailSheet'
import { HStack } from '@astryxdesign/core/HStack'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import WebhookEventsSelector from '#/components/settings/WebhookEventsSelector'
import type { WebhookEvent, WorkspaceWebhook } from '#/data/demo/webhooks'
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
  webhook: current,
  onOpenChange,
  onUpdate,
  onRemove,
}: WebhookDetailSheetProps) {
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  // Keep the last webhook on screen while the drawer animates closed.
  const [webhook, setWebhook] = useState(current)
  if (current && current !== webhook) setWebhook(current)

  if (!webhook) return null

  const meta = webhookStatusMeta(webhook)

  return (
    <>
      {/* Phone: a bottom sheet; desktop: the floating right-side drawer. */}
      <ResponsiveDetailSheet
        isOpen={current != null}
        onOpenChange={onOpenChange}
        label={webhook.name}
        title={webhook.name}
        subtitle="Webhook endpoint"
        width={420}
        hasFooterDivider
        footer={
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
              onClick={() => onUpdate(webhook.id, { isEnabled: !webhook.isEnabled })}
            />
          </HStack>
        }
      >
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

              </VStack>
      </ResponsiveDetailSheet>

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
