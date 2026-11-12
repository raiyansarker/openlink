import { useCallback, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { handleDomainsTableRowClick } from '#/components/domains/domains-table-row-click'
import { PlusIcon } from '#/components/icons/IcnMcp'
import CreateWebhookDrawer from '#/components/settings/CreateWebhookDrawer'
import WebhookDetailSheet from '#/components/settings/WebhookDetailSheet'
import WebhookRowMenu from '#/components/settings/WebhookRowMenu'
import {
  DEMO_WORKSPACE_WEBHOOKS,
  WEBHOOK_EVENT_LABELS,
  type WorkspaceWebhook,
} from '#/data/demo/webhooks'
import { webhookStatusMeta } from '#/lib/integrations/webhook-status'

type WebhookRow = WorkspaceWebhook & Record<string, unknown>

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diffMin = Math.round((Date.now() - then) / 60_000)
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
    return pathname === '/' ? hostname : `${hostname}${pathname}`
  } catch {
    return url
  }
}

function eventsSummary(events: WorkspaceWebhook['events']): string {
  const [first, ...rest] = events
  if (!first) return '—'
  const label = WEBHOOK_EVENT_LABELS[first]
  return rest.length > 0 ? `${label} +${rest.length}` : label
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

  const updateWebhook = useCallback(
    (id: string, patch: Partial<WorkspaceWebhook>) => {
      setWebhooks((prev) =>
        prev.map((hook) => (hook.id === id ? { ...hook, ...patch } : hook)),
      )
    },
    [],
  )

  const toggleWebhook = useCallback(
    (id: string, enabled: boolean) => updateWebhook(id, { isEnabled: enabled }),
    [updateWebhook],
  )

  const openRowAtIndex = (index: number) => {
    const row = webhooks[index]
    if (row) setSelectedId(row.id)
  }

  return (
    <VStack gap={6} hAlign="stretch" width="100%">
      <HStack hAlign="between" vAlign="start" gap={3} width="100%" wrap="wrap">
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
        <VStack
          className="members-table members-table--clickable-rows"
          width="100%"
          hAlign="stretch"
          onClick={(event) =>
            handleDomainsTableRowClick(event, webhooks.length, openRowAtIndex)
          }
        >
          <Table<WebhookRow>
            className="members-table__grid"
            data={webhooks as WebhookRow[]}
            idKey="id"
            density="balanced"
            dividers="rows"
            hasHover
            columns={[
              {
                key: 'name',
                header: 'Endpoint',
                width: proportional(1.8, { minWidth: 220 }),
                renderCell: (row) => (
                  <VStack gap={0} hAlign="start">
                    <Text weight="semibold">{row.name}</Text>
                    <Text type="supporting" color="secondary">
                      {endpointCaption(row.endpointUrl)}
                    </Text>
                  </VStack>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                width: pixel(150),
                renderCell: (row) => {
                  const meta = webhookStatusMeta(row)
                  return (
                    <HStack gap={2} vAlign="center">
                      <StatusDot variant={meta.dotVariant} label={meta.label} />
                      <Text type="supporting" color="secondary">
                        {meta.label}
                      </Text>
                    </HStack>
                  )
                },
              },
              {
                key: 'events',
                header: 'Events',
                width: proportional(1, { minWidth: 160 }),
                renderCell: (row) => (
                  <Text type="supporting" color="secondary">
                    {eventsSummary(row.events)}
                  </Text>
                ),
              },
              {
                key: 'lastDeliveryAt',
                header: 'Last sent',
                width: pixel(100),
                align: 'end',
                renderCell: (row) => (
                  <Text type="supporting" color="secondary">
                    {row.lastDeliveryAt
                      ? formatRelativeTime(row.lastDeliveryAt)
                      : '—'}
                  </Text>
                ),
              },
              {
                key: 'actions',
                header: '',
                width: pixel(56),
                align: 'end',
                renderCell: (row) => (
                  <WebhookRowMenu
                    webhook={row}
                    onOpen={setSelectedId}
                    onToggleEnabled={toggleWebhook}
                    onRemove={removeWebhook}
                  />
                ),
              },
            ]}
          />
        </VStack>
      )}

      <WebhookDetailSheet
        webhook={selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
        onUpdate={updateWebhook}
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
