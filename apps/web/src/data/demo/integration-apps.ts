export type IntegrationAppId = 'slack' | 'zapier'

export type IntegrationApp = {
  id: IntegrationAppId
  name: string
  description: string
  isConnected: boolean
  connectedDetail?: string
}

export const DEMO_INTEGRATION_APPS: IntegrationApp[] = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Post link and click alerts to a channel.',
    isConnected: false,
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Trigger Zaps when links change or get clicks.',
    isConnected: false,
  },
]
