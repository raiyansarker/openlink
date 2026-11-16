import {
  WEBHOOK_EVENT_DEFINITIONS,
  type WebhookEvent,
  type WebhookEventGroup,
} from '#/data/demo/webhooks'

type SamplePart = { subject: { type: string; id: string; label: string }; data?: Record<string, unknown> }

const SAMPLE_BY_GROUP: Record<WebhookEventGroup, SamplePart> = {
  links: { subject: { type: 'link', id: 'lnk_8f2k1', label: 'Spring launch' } },
  clicks: {
    subject: { type: 'link', id: 'lnk_8f2k1', label: 'Spring launch' },
    data: { clickCount: 1000, country: 'US', platform: 'ios', delivery: 'redirect' },
  },
  domains: { subject: { type: 'domain', id: 'dom_3k9a', label: 'go.example.com' } },
  members: { subject: { type: 'member', id: 'usr_71bd', label: 'member@example.com' } },
  developers: { subject: { type: 'api_key', id: 'key_2c8e', label: 'Zapier' } },
  workspace: { subject: { type: 'workspace', id: 'org_5d1a', label: 'Acme' } },
}

/** Pretty-printed example body for one event type, in the shape the server publishes. */
export function sampleWebhookPayload(event: WebhookEvent): string {
  const sample = SAMPLE_BY_GROUP[WEBHOOK_EVENT_DEFINITIONS[event].group]
  const byPerson = WEBHOOK_EVENT_DEFINITIONS[event].group !== 'clicks'
  return JSON.stringify(
    {
      id: 'evt_0c4f9a2e',
      type: event,
      organizationId: 'org_5d1a',
      occurredAt: '2026-11-13T09:30:00.000Z',
      subject: sample.subject,
      ...(byPerson ? { actor: { type: 'member', id: 'usr_9a1f', label: 'Ada Lovelace' } } : {}),
      ...(sample.data ? { data: sample.data } : {}),
    },
    null,
    2,
  )
}

/** Strip a pasted scheme so the field only holds host and path. */
export function stripScheme(value: string): string {
  return value.trim().replace(/^https?:\/\//i, '')
}

export type EndpointCheck =
  | { ok: true; url: string; hostname: string }
  | { ok: false; message: string }

/** Validate host + path typed after the fixed https:// prefix. */
export function checkEndpoint(hostAndPath: string): EndpointCheck {
  const rest = stripScheme(hostAndPath)
  if (!rest) return { ok: false, message: 'Enter the host and path.' }
  try {
    const url = new URL(`https://${rest}`)
    if (!url.hostname.includes('.')) {
      return { ok: false, message: 'Use a public host, like hooks.example.com.' }
    }
    return { ok: true, url: url.toString(), hostname: url.hostname }
  } catch {
    return { ok: false, message: 'This does not look like a valid URL.' }
  }
}
