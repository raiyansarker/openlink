import { describe, expect, test } from 'bun:test'
import type { link } from '@openlink/db/schema'
import { toLinkDto } from './serializers'

const now = new Date('2026-01-01T00:00:00Z')
const row = (overrides: Partial<typeof link.$inferSelect> = {}): typeof link.$inferSelect => ({
  id: 'l1', organizationId: 'o1', domainId: 'd1', folderId: null, slug: 's', alias: null, title: null,
  description: null, destinationUrl: 'https://example.com', redirectStatus: 302, status: 'active',
  enabled: true, activateAt: null, expiresAt: null, maxClicks: null, clickCount: 0, passwordHash: null,
  expiredDestinationUrl: null, fallbackDestinationUrl: null, tagsJson: '[]', utmJson: null,
  metadataJson: null, createdByUserId: null, createdAt: now, updatedAt: now, ...overrides,
})

describe('toLinkDto', () => {
  test('reports the derived status, not the stored one', () => {
    expect(toLinkDto(row({ expiresAt: new Date('2020-01-01') })).status).toBe('expired')
    expect(toLinkDto(row({ maxClicks: 3, clickCount: 3 })).status).toBe('expired')
    expect(toLinkDto(row({ activateAt: new Date('2999-01-01') })).status).toBe('scheduled')
    expect(toLinkDto(row({ enabled: false })).status).toBe('disabled')
    expect(toLinkDto(row()).status).toBe('active')
  })

  test('exposes folder, password flag and parsed json without leaking the hash', () => {
    const dto = toLinkDto(row({ folderId: 'f1', passwordHash: 'secret', tagsJson: '["a"]', utmJson: '{"source":"x"}' }))
    expect(dto).toMatchObject({ folderId: 'f1', passwordProtected: true, tags: ['a'], utm: { source: 'x' } })
    expect(JSON.stringify(dto)).not.toContain('secret')
  })
})
