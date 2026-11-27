import { describe, expect, test } from 'bun:test'

import type { ShortLink } from '#/lib/api/types'
import { csvField, exportFileName, linksToCsv } from './export-links'
import { linkStatusLabel } from './link-summary'

function makeLink(overrides: Partial<ShortLink> = {}): ShortLink {
  const base = {
    id: 'l1',
    organizationId: 'o1',
    domainId: null,
    slug: 'spring-sale',
    destinationUrl: 'https://example.com/spring',
    status: 'active' as const,
    clickCount: 42,
    createdAt: '2025-01-15T10:00:00.000Z',
    updatedAt: '2025-01-15T10:00:00.000Z',
  }
  return { ...base, ...overrides } as ShortLink
}

describe('csvField', () => {
  test('leaves plain values verbatim', () => {
    expect(csvField('spring-sale')).toBe('spring-sale')
    expect(csvField('')).toBe('')
  })

  test('quotes fields with commas, quotes and line breaks, doubling quotes', () => {
    expect(csvField('Sale, up to 50%')).toBe('"Sale, up to 50%"')
    expect(csvField('The "best" link')).toBe('"The ""best"" link"')
    expect(csvField('two\nlines')).toBe('"two\nlines"')
    expect(csvField('carriage\rreturn')).toBe('"carriage\rreturn"')
  })
})

describe('linksToCsv', () => {
  const options = {
    shortUrlFor: (link: ShortLink) => `https://go.test/${link.slug}`,
  }

  test('writes one header row plus one row per link', () => {
    const csv = linksToCsv(
      [
        makeLink(),
        makeLink({ id: 'l2', slug: 'other', title: 'Other', clickCount: 0 }),
      ],
      options,
    )
    const lines = csv.split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[0]).toBe(
      'name,short_url,destination_url,status,clicks,tags,created_at',
    )
    expect(lines[1]).toBe(
      ',https://go.test/spring-sale,https://example.com/spring,Live,42,,2025-01-15T10:00:00.000Z',
    )
    expect(lines[2]).toContain('Other,https://go.test/other')
  })

  test('escapes titles containing commas and quotes', () => {
    const csv = linksToCsv([makeLink({ title: 'Launch, "big" version' })], options)
    expect(csv.split('\n')[1]).toContain('"Launch, ""big"" version"')
  })

  test('joins tags with semicolons and leaves empty tags empty', () => {
    const csv = linksToCsv([makeLink({ tags: ['summer', 'paid'] })], options)
    expect(csv.split('\n')[1]).toContain('summer;paid')
  })

  test('reports the live status label, not the stored status', () => {
    const link = makeLink({ status: 'scheduled' })
    const csv = linksToCsv([link], options)
    expect(csv).toContain(linkStatusLabel(link))
  })
})

describe('exportFileName', () => {
  test('uses the slug and the UTC date', () => {
    expect(exportFileName('acme', new Date('2025-03-01T23:30:00.000Z'))).toBe(
      'openlink-acme-links-2025-03-01.csv',
    )
  })
})
