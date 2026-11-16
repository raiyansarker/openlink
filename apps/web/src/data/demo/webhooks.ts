import { WorkspaceEvents, type WorkspaceEventGroup, type WorkspaceEventType } from '@openlink/contracts'

/** Webhook subscriptions use the workspace event catalogue shared with the server. */
export type WebhookEventGroup = WorkspaceEventGroup
export type WebhookEvent = WorkspaceEventType

export const WEBHOOK_EVENT_DEFINITIONS = WorkspaceEvents.DEFINITIONS

export const WEBHOOK_EVENTS: WebhookEvent[] = WorkspaceEvents.TYPES

export const WEBHOOK_EVENT_GROUP_LABELS: Record<WebhookEventGroup, string> = WorkspaceEvents.GROUP_LABELS

export const WEBHOOK_EVENT_LABELS = Object.fromEntries(
  WEBHOOK_EVENTS.map((event) => [event, WEBHOOK_EVENT_DEFINITIONS[event].label]),
) as Record<WebhookEvent, string>

export type WorkspaceWebhook = {
  id: string
  name: string
  endpointUrl: string
  events: WebhookEvent[]
  isEnabled: boolean
  signingSecretPrefix: string
  lastDeliveryAt: string | null
  lastDeliveryStatus: 'success' | 'failure' | null
}

export const DEMO_WORKSPACE_WEBHOOKS: WorkspaceWebhook[] = [
  {
    id: 'wh_1',
    name: 'Production alerts',
    endpointUrl: 'https://hooks.acme.com/openlink/events',
    events: ['link.created', 'link.updated', 'click.milestone', 'domain.misconfigured'],
    isEnabled: true,
    signingSecretPrefix: 'whsec_live_91c2',
    lastDeliveryAt: '2026-11-12T18:04:00.000Z',
    lastDeliveryStatus: 'success',
  },
  {
    id: 'wh_2',
    name: 'Data warehouse',
    endpointUrl: 'https://ingest.analytics.dev/v1/openlink',
    events: ['click.recorded', 'click.milestone', 'link.created', 'link.deleted'],
    isEnabled: true,
    signingSecretPrefix: 'whsec_live_a44f',
    lastDeliveryAt: '2026-11-11T09:12:00.000Z',
    lastDeliveryStatus: 'failure',
  },
  {
    id: 'wh_3',
    name: 'Staging',
    endpointUrl: 'https://staging.example.com/webhooks/openlink',
    events: ['link.created'],
    isEnabled: false,
    signingSecretPrefix: 'whsec_test_7e01',
    lastDeliveryAt: null,
    lastDeliveryStatus: null,
  },
]
