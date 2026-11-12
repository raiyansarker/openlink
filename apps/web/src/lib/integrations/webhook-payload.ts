import type { WebhookEvent } from '#/data/demo/webhooks'

const SAMPLE_DATA: Record<WebhookEvent, Record<string, unknown>> = {
  'link.created': {
    id: 'lnk_8f2k1',
    shortUrl: 'https://opl.ink/launch',
    destination: 'https://example.com/launch',
  },
  'link.updated': {
    id: 'lnk_8f2k1',
    changes: { destination: 'https://example.com/launch-v2' },
  },
  'link.deleted': {
    id: 'lnk_8f2k1',
  },
  'click.milestone': {
    id: 'lnk_8f2k1',
    milestone: 1000,
  },
}

/** Pretty-printed example body for one event type. */
export function sampleWebhookPayload(event: WebhookEvent): string {
  return JSON.stringify(
    {
      type: event,
      createdAt: '2026-11-13T09:30:00.000Z',
      data: SAMPLE_DATA[event],
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
