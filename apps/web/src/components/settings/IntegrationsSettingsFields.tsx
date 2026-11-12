import { useCallback, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { List, ListItem } from '@astryxdesign/core/List'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { PlusIcon } from '#/components/icons/IcnMcp'
import CreateWebhookDrawer from '#/components/settings/CreateWebhookDrawer'
import WebhookDetailSheet from '#/components/settings/WebhookDetailSheet'
import WebhookRowMenu from '#/components/settings/WebhookRowMenu'
import {
  DEMO_WORKSPACE_WEBHOOKS,
  type WorkspaceWebhook,
} from '#/data/demo/webhooks'
import { webhookStatusMeta } from '#/lib/integrations/webhook-status'

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diffMin = Math.round((now - then) / 60_000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.round(diffMin / 60)
  if (diffHours < 48) return `${diffHours}h ago`
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function endpointHost(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function eventCountLabel(count: number): string {
  return count === 1 ? '1 event' : `${count} events`
}

export default function IntegrationsSettingsFields() {
  const [webhooks, setWebhooks] = useState<WorkspaceWebhook[]>(
    () => DEMO_WORKSPACE_WEBHOOKS,
  )
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = webhooks.find((hook) => hook.id === selectedId) ?? null

  const removeWebhook = useCallback((id: string) => {
    setWebhooks((prev) => prev.filter((hook) => hook.id !== id))
  }, [])

  const toggleWebhook = useCallback((id: string, enabled: boolean) => {
    setWebhooks((prev) =>
      prev.map((hook) =>
        hook.id === id ? { ...hook, isEnabled: enabled } : hook,
      ),
    )
  }, [])

  return (
    <VStack gap={5} hAlign="stretch" width="100%">
      <HStack hAlign="between" vAlign="start" gap={3} width="100%">
        <VStack gap={1} hAlign="start">
          <Heading level={1}>Webhooks</Heading>
          <Text type="supporting" color="secondary">
            HTTPS endpoints that receive signed workspace events.
          </Text>
        </VStack>
        <Button
          variant="secondary"
          size="sm"
          label="Add webhook"
          icon={<PlusIcon size={14} style={{ display: 'flex' }} />}
          onClick={() => setCreateOpen(true)}
        />
      </HStack>

      {webhooks.length === 0 ? (
        <EmptyState
          isCompact
          headingLevel={4}
          title="No webhooks yet"
          description="Add one when you are ready to receive events."
          actions={
            <Button
              variant="secondary"
              size="sm"
              label="Add webhook"
              onClick={() => setCreateOpen(true)}
            />
          }
        />
      ) : (
        <List hasDividers edge="flush" density="balanced">
          {webhooks.map((webhook) => {
            const meta = webhookStatusMeta(webhook)
            return (
              <ListItem
                key={webhook.id}
                itemKey={webhook.id}
                align="first-line"
                onClick={() => setSelectedId(webhook.id)}
                startContent={
                  <StatusDot variant={meta.dotVariant} label={meta.label} />
                }
                label={webhook.name}
                description={`${endpointHost(webhook.endpointUrl)} · ${eventCountLabel(
                  webhook.events.length,
                )}`}
                endContent={
                  <HStack gap={1} vAlign="center" hAlign="end">
                    <Text type="supporting" color="secondary">
                      {webhook.lastDeliveryAt
                        ? formatRelativeTime(webhook.lastDeliveryAt)
                        : meta.label}
                    </Text>
                    <WebhookRowMenu
                      webhook={webhook}
                      onOpen={setSelectedId}
                      onToggleEnabled={toggleWebhook}
                      onRemove={removeWebhook}
                    />
                  </HStack>
                }
              />
            )
          })}
        </List>
      )}

      <WebhookDetailSheet
        webhook={selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
        onToggleEnabled={toggleWebhook}
        onRemove={removeWebhook}
      />

      <CreateWebhookDrawer
        isOpen={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={(webhook) => {
          setWebhooks((prev) => [webhook, ...prev])
        }}
      />
    </VStack>
  )
}
