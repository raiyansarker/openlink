import { describe, expect, test } from 'bun:test'
import { createOpenLinkDomainClient } from './index'

describe('@openlink/domain', () => {
  test('creates memory provider client by default', () => {
    const client = createOpenLinkDomainClient({ DOMAIN_PROVIDER: 'memory' })
    expect(client.provider).toBe('memory')
  })

  test('memory mode activates domains as soon as they are added', async () => {
    const client = createOpenLinkDomainClient({ DOMAIN_PROVIDER: 'memory' })
    const domain = await client.add('go.company.com')
    expect(domain.status).toBe('active')
    expect(domain.records.every((record) => record.status === 'valid')).toBe(true)
  })

  test('rejects cloudflare mode without credentials', () => {
    expect(() =>
      createOpenLinkDomainClient({
        DOMAIN_PROVIDER: 'cloudflare',
      }),
    ).toThrow(/CF_API_TOKEN/)
  })
})
