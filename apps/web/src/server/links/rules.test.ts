import { describe, expect, test } from 'bun:test'
import type { link } from '@openlink/db/schema'
import { deriveLinkStatus, generateSlug } from './rules'

function linkRow(overrides: Partial<typeof link.$inferSelect>): typeof link.$inferSelect {
  return {
    id: 'link-1',
    organizationId: 'org-1',
    domainId: 'domain-1',
    slug: 'abc',
    alias: null,
    title: null,
    description: null,
    destinationUrl: 'https://example.com',
    redirectStatus: 302,
    status: 'active',
    enabled: true,
    activateAt: null,
    expiresAt: null,
    maxClicks: null,
    clickCount: 0,
    passwordHash: null,
    expiredDestinationUrl: null,
    fallbackDestinationUrl: null,
    tagsJson: '[]',
    utmJson: null,
    metadataJson: null,
    createdByUserId: null,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date('2020-01-01'),
    ...overrides,
  }
}

describe('generateSlug', () => {
  test('uses default length 8 from allowed alphabet', () => {
    const slug = generateSlug()
    expect(slug).toHaveLength(8)
    expect(slug).toMatch(/^[A-Za-z0-9]+$/)
  })
})

describe('deriveLinkStatus', () => {
  const now = new Date('2025-06-01T12:00:00.000Z')

  test('scheduled before activateAt', () => {
    expect(
      deriveLinkStatus(
        linkRow({ activateAt: new Date('2025-12-01'), status: 'active' }),
        now,
      ),
    ).toBe('scheduled')
  })

  test('expired after expiresAt', () => {
    expect(
      deriveLinkStatus(
        linkRow({ expiresAt: new Date('2025-01-01'), status: 'active' }),
        now,
      ),
    ).toBe('expired')
  })

  test('expired when max clicks reached', () => {
    expect(
      deriveLinkStatus(
        linkRow({ maxClicks: 10, clickCount: 10, status: 'active' }),
        now,
      ),
    ).toBe('expired')
  })

  test('paused when explicitly paused', () => {
    expect(deriveLinkStatus(linkRow({ status: 'paused' }), now)).toBe('paused')
  })
})
