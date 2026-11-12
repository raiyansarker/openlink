export type WebhookEventGroup = 'links' | 'clicks' | 'domains' | 'members'

type WebhookEventDefinition = {
  label: string
  description: string
  group: WebhookEventGroup
}

export const WEBHOOK_EVENT_DEFINITIONS = {
  'link.created': {
    label: 'Link created',
    description: 'A new short link is created',
    group: 'links',
  },
  'link.updated': {
    label: 'Link updated',
    description: 'A destination or setting changes',
    group: 'links',
  },
  'link.deleted': {
    label: 'Link deleted',
    description: 'A short link is removed',
    group: 'links',
  },
  'link.expired': {
    label: 'Link expired',
    description: 'A link passes its expiry date',
    group: 'links',
  },
  'link.archived': {
    label: 'Link archived',
    description: 'A link is moved to the archive',
    group: 'links',
  },
  'click.recorded': {
    label: 'Click recorded',
    description: 'Every click on any link (high volume)',
    group: 'clicks',
  },
  'click.milestone': {
    label: 'Click milestone',
    description: 'A link reaches 100, 1k, 10k… clicks',
    group: 'clicks',
  },
  'qr.scanned': {
    label: 'QR code scanned',
    description: 'A QR code for a link is scanned',
    group: 'clicks',
  },
  'domain.added': {
    label: 'Domain added',
    description: 'A custom domain is connected',
    group: 'domains',
  },
  'domain.verified': {
    label: 'Domain verified',
    description: 'DNS checks pass for a domain',
    group: 'domains',
  },
  'domain.misconfigured': {
    label: 'Domain misconfigured',
    description: 'DNS stops matching for a domain',
    group: 'domains',
  },
  'domain.removed': {
    label: 'Domain removed',
    description: 'A custom domain is disconnected',
    group: 'domains',
  },
  'member.invited': {
    label: 'Member invited',
    description: 'Someone is invited to the workspace',
    group: 'members',
  },
  'member.joined': {
    label: 'Member joined',
    description: 'An invite is accepted',
    group: 'members',
  },
  'member.removed': {
    label: 'Member removed',
    description: 'Someone leaves or is removed',
    group: 'members',
  },
} as const satisfies Record<string, WebhookEventDefinition>

export type WebhookEvent = keyof typeof WEBHOOK_EVENT_DEFINITIONS

export const WEBHOOK_EVENTS = Object.keys(
  WEBHOOK_EVENT_DEFINITIONS,
) as WebhookEvent[]

export const WEBHOOK_EVENT_GROUP_LABELS: Record<WebhookEventGroup, string> = {
  links: 'Links',
  clicks: 'Clicks & scans',
  domains: 'Domains',
  members: 'Members',
}

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
    events: ['click.recorded', 'qr.scanned', 'link.created', 'link.deleted'],
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
