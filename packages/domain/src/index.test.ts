import { describe, expect, test } from 'bun:test'
import { createOpenLinkDomainClient } from './index'

describe('@openlink/domain', () => {
  test('creates memory provider client by default', () => {
    const client = createOpenLinkDomainClient({ DOMAIN_PROVIDER: 'memory' })
    expect(client.provider).toBe('memory')
  })

  test('rejects cloudflare mode without credentials', () => {
    expect(() =>
      createOpenLinkDomainClient({
        DOMAIN_PROVIDER: 'cloudflare',
      }),
    ).toThrow(/CF_API_TOKEN/)
  })
})
