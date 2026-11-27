import { describe, expect, test } from 'bun:test'

import type { ShortLink } from '#/lib/api/types'
import { sortLinks } from './sort-links'

function makeLink(overrides: Partial<ShortLink> = {}): ShortLink {
  const base = {
    id: 'l1',
    organizationId: 'o1',
    domainId: null,
    slug: 'b-link',
    destinationUrl: 'https://example.com/b',
    status: 'active' as const,
    clickCount: 10,
    createdAt: '2025-01-02T10:00:00.000Z',
    updatedAt: '2025-01-02T10:00:00.000Z',
  }
  return { ...base, ...overrides } as ShortLink
}

const fixtures = (): ShortLink[] => [
  makeLink({ id: 'a', slug: 'c-link', title: 'banana', clickCount: 3, createdAt: '2025-01-03T10:00:00.000Z', destinationUrl: 'https://example.com/c' }),
  makeLink({ id: 'b', slug: 'a-link', title: 'Apple', clickCount: 30, createdAt: '2025-01-01T10:00:00.000Z', destinationUrl: 'https://example.com/a' }),
  makeLink({ id: 'c', slug: 'b-link', title: 'cherry', clickCount: 30, createdAt: '2025-01-02T10:00:00.000Z', destinationUrl: 'https://example.com/b' }),
]

describe('sortLinks', () => {
  test('empty sort returns a copy in the caller’s order', () => {
    const links = fixtures()
    const sorted = sortLinks(links, [])
    expect(sorted).not.toBe(links)
    expect(sorted.map((l) => l.id)).toEqual(['a', 'b', 'c'])
  })

  test('sorts by title case-insensitively, ascending then descending', () => {
    expect(
      sortLinks(fixtures(), [{ sortKey: 'title', direction: 'ascending' }]).map((l) => l.id),
    ).toEqual(['b', 'a', 'c'])
    expect(
      sortLinks(fixtures(), [{ sortKey: 'title', direction: 'descending' }]).map((l) => l.id),
    ).toEqual(['c', 'a', 'b'])
  })

  test('sorts numeric click counts', () => {
    expect(
      sortLinks(fixtures(), [{ sortKey: 'clickCount', direction: 'descending' }]).map((l) => l.id),
    ).toEqual(['b', 'c', 'a'])
  })

  test('sorts by creation date', () => {
    expect(
      sortLinks(fixtures(), [{ sortKey: 'createdAt', direction: 'ascending' }]).map((l) => l.id),
    ).toEqual(['b', 'c', 'a'])
  })

  test('sorts by slug (short URL)', () => {
    expect(
      sortLinks(fixtures(), [{ sortKey: 'shortUrl', direction: 'ascending' }]).map((l) => l.id),
    ).toEqual(['b', 'c', 'a'])
  })

  test('sorts by destination URL', () => {
    expect(
      sortLinks(fixtures(), [{ sortKey: 'targetUrl', direction: 'ascending' }]).map((l) => l.id),
    ).toEqual(['b', 'c', 'a'])
  })

  test('sorts by live status label', () => {
    const links = [
      makeLink({ id: 'paused', status: 'paused' as const }),
      makeLink({ id: 'active', status: 'active' as const }),
    ]
    expect(
      sortLinks(links, [{ sortKey: 'status', direction: 'ascending' }]).map((l) => l.id),
    ).toEqual(['active', 'paused'])
  })

  test('ties keep their original (stable) order', () => {
    const links = [
      makeLink({ id: 'first', slug: 'same' }),
      makeLink({ id: 'second', slug: 'same' }),
    ]
    expect(
      sortLinks(links, [{ sortKey: 'shortUrl', direction: 'ascending' }]).map((l) => l.id),
    ).toEqual(['first', 'second'])
  })
})
