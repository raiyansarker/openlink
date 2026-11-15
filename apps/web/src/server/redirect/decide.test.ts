import { describe, expect, test } from 'bun:test'
import type { link } from '@openlink/db/schema'
import { applyUtm, decideRedirect } from './decide'

const NOW = new Date('2026-06-01T00:00:00Z')

function row(overrides: Partial<typeof link.$inferSelect> = {}): typeof link.$inferSelect {
  return {
    id: 'l1',
    organizationId: 'o1',
    domainId: 'd1',
    slug: 'abc',
    alias: null,
    title: null,
    description: null,
    destinationUrl: 'https://example.com/page',
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
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

describe('applyUtm', () => {
  test('adds utm parameters', () => {
    expect(applyUtm('https://example.com/', { source: 'x', campaign: 'launch' })).toBe(
      'https://example.com/?utm_source=x&utm_campaign=launch',
    )
  })

  test('keeps parameters already on the destination', () => {
    expect(applyUtm('https://example.com/?utm_source=keep', { source: 'x', medium: 'm' })).toBe(
      'https://example.com/?utm_source=keep&utm_medium=m',
    )
  })

  test('returns the input for no utm or an unparsable URL', () => {
    expect(applyUtm('https://example.com/', null)).toBe('https://example.com/')
    expect(applyUtm('not a url', { source: 'x' })).toBe('not a url')
  })
})

describe('decideRedirect', () => {
  test('active link redirects with its status and counts the click', () => {
    expect(decideRedirect(row({ redirectStatus: 301 }), { now: NOW })).toEqual({
      type: 'redirect',
      url: 'https://example.com/page',
      status: 301,
      countsClick: true,
    })
  })

  test('applies stored utm parameters', () => {
    const decision = decideRedirect(row({ utmJson: '{"source":"news"}' }), { now: NOW })
    expect(decision).toMatchObject({ url: 'https://example.com/page?utm_source=news' })
  })

  test('ignores corrupt utm json', () => {
    expect(decideRedirect(row({ utmJson: '{bad' }), { now: NOW })).toMatchObject({
      url: 'https://example.com/page',
    })
  })

  test('paused, disabled, draft and scheduled links are not found without a fallback', () => {
    for (const overrides of [
      { status: 'paused' as const },
      { status: 'disabled' as const },
      { enabled: false },
      { status: 'draft' as const },
      { activateAt: new Date('2027-01-01') },
    ]) {
      expect(decideRedirect(row(overrides), { now: NOW })).toEqual({ type: 'not_found' })
    }
  })

  test('inactive links use the fallback destination without counting a click', () => {
    expect(
      decideRedirect(row({ status: 'paused', fallbackDestinationUrl: 'https://example.com/soon' }), { now: NOW }),
    ).toEqual({ type: 'redirect', url: 'https://example.com/soon', status: 302, countsClick: false })
  })

  test('expired links are gone, or use the expired then fallback destination', () => {
    const expired = { expiresAt: new Date('2026-01-01') }
    expect(decideRedirect(row(expired), { now: NOW })).toEqual({ type: 'gone' })
    expect(
      decideRedirect(row({ ...expired, fallbackDestinationUrl: 'https://f.test' }), { now: NOW }),
    ).toMatchObject({ url: 'https://f.test', countsClick: false })
    expect(
      decideRedirect(
        row({ ...expired, fallbackDestinationUrl: 'https://f.test', expiredDestinationUrl: 'https://e.test' }),
        { now: NOW },
      ),
    ).toMatchObject({ url: 'https://e.test' })
  })

  test('a link at its click limit is expired', () => {
    expect(decideRedirect(row({ maxClicks: 5, clickCount: 5 }), { now: NOW })).toEqual({ type: 'gone' })
  })

  test('password protected links require verification', () => {
    const protectedRow = row({ passwordHash: 'hash' })
    expect(decideRedirect(protectedRow, { now: NOW })).toEqual({ type: 'password_required' })
    expect(decideRedirect(protectedRow, { now: NOW, passwordVerified: true })).toMatchObject({
      type: 'redirect',
    })
  })

  test('a protected link that is inactive does not reveal the password form', () => {
    expect(decideRedirect(row({ passwordHash: 'hash', status: 'paused' }), { now: NOW })).toEqual({
      type: 'not_found',
    })
  })
})
