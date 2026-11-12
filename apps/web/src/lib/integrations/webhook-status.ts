import type { WorkspaceWebhook } from '#/data/demo/webhooks'

export type WebhookStatusDotVariant = 'success' | 'error' | 'neutral'

export type WebhookStatusMeta = {
  label: string
  description: string
  dotVariant: WebhookStatusDotVariant
}

export function webhookStatusMeta(webhook: WorkspaceWebhook): WebhookStatusMeta {
  if (!webhook.isEnabled) {
    return {
      label: 'Paused',
      description: 'No events are sent while this endpoint is disabled.',
      dotVariant: 'neutral',
    }
  }
  if (webhook.lastDeliveryStatus === 'failure') {
    return {
      label: 'Last delivery failed',
      description: 'Your server did not accept the most recent event.',
      dotVariant: 'error',
    }
  }
  if (webhook.lastDeliveryStatus === 'success') {
    return {
      label: 'Healthy',
      description: 'The most recent event was delivered.',
      dotVariant: 'success',
    }
  }
  return {
    label: 'Waiting for first event',
    description: 'Nothing has been delivered to this endpoint yet.',
    dotVariant: 'neutral',
  }
}
