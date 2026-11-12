import { useCallback, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { List, ListItem } from '@astryxdesign/core/List'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { PlusIcon } from '#/components/icons/IcnMcp'
import CreateWebhookDrawer from '#/components/settings/CreateWebhookDrawer'
import WebhookRowMenu from '#/components/settings/WebhookRowMenu'
import {
  DEMO_WORKSPACE_WEBHOOKS,
  type WorkspaceWebhook,
} from '#/data/demo/webhooks'

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

function endpointCaption(url: string): string {
  try {
    const { hostname, pathname } = new URL(url)
    const path = pathname === '/' ? '' : pathname
    const full = `${hostname}${path}`
    return full.length > 52 ? `${full.slice(0, 49)}…` : full
  } catch {
    return url.length > 52 ? `${url.slice(0, 49)}…` : url
  }
}

function eventCountLabel(count: number): string {
  return count === 1 ? '1 event' : `${count} events`
}

function webhookDescription(webhook: WorkspaceWebhook): string {
  const base = `${endpointCaption(webhook.endpointUrl)} · ${eventCountLabel(
    webhook.events.length,
  )}`
  return webhook.isEnabled ? base : `Paused · ${base}`
}

export default function IntegrationsSettingsFields() {
  const [webhooks, setWebhooks] = useState<WorkspaceWebhook[]>(
    () => DEMO_WORKSPACE_WEBHOOKS,
  )
  const [createOpen, setCreateOpen] = useState(false)

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
      <VStack gap={1} hAlign="start">
        <Heading level={1}>Webhooks</Heading>
        <Text type="supporting" color="secondary">
          HTTPS endpoints that receive signed workspace events.
        </Text>
      </VStack>

      <VStack gap={3} hAlign="stretch" width="100%" paddingBlockStart={5}>
        <HStack hAlign="end" width="100%">
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
          <List hasDividers edge="flush" density="comfortable">
            {webhooks.map((webhook) => (
              <ListItem
                key={webhook.id}
                itemKey={webhook.id}
                align="first-line"
                label={
                  <Text
                    weight="semibold"
                    color={webhook.isEnabled ? 'primary' : 'secondary'}
                  >
                    {webhook.name}
                  </Text>
                }
                description={webhookDescription(webhook)}
                endContent={
                  <HStack gap={1} vAlign="center" hAlign="end">
                    {webhook.lastDeliveryAt ? (
                      <Text type="supporting" color="secondary">
                        {formatRelativeTime(webhook.lastDeliveryAt)}
                      </Text>
                    ) : null}
                    <WebhookRowMenu
                      webhook={webhook}
                      onToggleEnabled={toggleWebhook}
                      onRemove={removeWebhook}
                    />
                  </HStack>
                }
              />
            ))}
          </List>
        )}
      </VStack>

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
