import { describe, expect, test } from 'bun:test'
import type { link } from '@openlink/db/schema'
import { RedirectRules, Utm } from './decide'
import { Visitor } from './visitor'

const NOW = new Date('2026-06-01T00:00:00Z')

function row(overrides: Partial<typeof link.$inferSelect> = {}): typeof link.$inferSelect {
  return {
    id: 'l1',
    organizationId: 'o1',
    domainId: 'd1',
    folderId: null,
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
    deliveryJson: null,
    createdByUserId: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

describe('Utm.apply', () => {
  test('adds utm parameters', () => {
    expect(Utm.apply('https://example.com/', { source: 'x', campaign: 'launch' })).toBe(
      'https://example.com/?utm_source=x&utm_campaign=launch',
    )
  })

  test('keeps parameters already on the destination', () => {
    expect(Utm.apply('https://example.com/?utm_source=keep', { source: 'x', medium: 'm' })).toBe(
      'https://example.com/?utm_source=keep&utm_medium=m',
    )
  })

  test('returns the input for no utm or an unparsable URL', () => {
    expect(Utm.apply('https://example.com/', null)).toBe('https://example.com/')
    expect(Utm.apply('not a url', { source: 'x' })).toBe('not a url')
  })
})

describe('RedirectRules.decide', () => {
  test('active link redirects with its status and counts the click', () => {
    expect(RedirectRules.decide(row({ redirectStatus: 301 }), { now: NOW })).toEqual({
      type: 'redirect',
      url: 'https://example.com/page',
      status: 301,
      countsClick: true,
    })
  })

  test('applies stored utm parameters', () => {
    const decision = RedirectRules.decide(row({ utmJson: '{"source":"news"}' }), { now: NOW })
    expect(decision).toMatchObject({ url: 'https://example.com/page?utm_source=news' })
  })

  test('ignores corrupt utm json', () => {
    expect(RedirectRules.decide(row({ utmJson: '{bad' }), { now: NOW })).toMatchObject({
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
      expect(RedirectRules.decide(row(overrides), { now: NOW })).toEqual({ type: 'not_found' })
    }
  })

  test('inactive links use the fallback destination without counting a click', () => {
    expect(
      RedirectRules.decide(row({ status: 'paused', fallbackDestinationUrl: 'https://example.com/soon' }), { now: NOW }),
    ).toEqual({ type: 'redirect', url: 'https://example.com/soon', status: 302, countsClick: false })
  })

  test('expired links are gone, or use the expired then fallback destination', () => {
    const expired = { expiresAt: new Date('2026-01-01') }
    expect(RedirectRules.decide(row(expired), { now: NOW })).toEqual({ type: 'gone' })
    expect(
      RedirectRules.decide(row({ ...expired, fallbackDestinationUrl: 'https://f.test' }), { now: NOW }),
    ).toMatchObject({ url: 'https://f.test', countsClick: false })
    expect(
      RedirectRules.decide(
        row({ ...expired, fallbackDestinationUrl: 'https://f.test', expiredDestinationUrl: 'https://e.test' }),
        { now: NOW },
      ),
    ).toMatchObject({ url: 'https://e.test' })
  })

  test('a link at its click limit is expired', () => {
    expect(RedirectRules.decide(row({ maxClicks: 5, clickCount: 5 }), { now: NOW })).toEqual({ type: 'gone' })
  })

  test('password protected links require verification', () => {
    const protectedRow = row({ passwordHash: 'hash' })
    expect(RedirectRules.decide(protectedRow, { now: NOW })).toEqual({ type: 'password_required' })
    expect(RedirectRules.decide(protectedRow, { now: NOW, passwordVerified: true })).toMatchObject({
      type: 'redirect',
    })
  })

  test('a protected link that is inactive does not reveal the password form', () => {
    expect(RedirectRules.decide(row({ passwordHash: 'hash', status: 'paused' }), { now: NOW })).toEqual({
      type: 'not_found',
    })
  })
})

describe('hold', () => {
  const held = (hold: object) => row({ deliveryJson: JSON.stringify({ hold }) })

  test('a held link serves its hold page and counts no click', () => {
    expect(RedirectRules.decide(held({ page: 'maintenance' }), { now: NOW })).toEqual({ type: 'hold', page: 'maintenance' })
  })

  test('the hold lifts at releaseAt', () => {
    const hold = { page: 'bad-gateway', releaseAt: '2026-05-31T00:00:00Z' }
    expect(RedirectRules.decide(held(hold), { now: NOW }).type).toBe('redirect')
    expect(RedirectRules.decide(held({ ...hold, releaseAt: '2026-06-02T00:00:00Z' }), { now: NOW }).type).toBe('hold')
  })

  test('hold comes before the password form, after expiry and schedule', () => {
    const withPassword = row({ deliveryJson: JSON.stringify({ hold: { page: 'gateway-timeout' } }), passwordHash: 'x' })
    expect(RedirectRules.decide(withPassword, { now: NOW }).type).toBe('hold')
    const expired = row({ deliveryJson: JSON.stringify({ hold: { page: 'gateway-timeout' } }), expiresAt: new Date('2026-01-01') })
    expect(RedirectRules.decide(expired, { now: NOW }).type).toBe('gone')
  })
})

describe('targeting', () => {
  const targeted = row({
    destinationUrl: 'https://example.com/main',
    utmJson: JSON.stringify({ source: 'qr' }),
    deliveryJson: JSON.stringify({
      targeting: {
        ios: 'https://apps.apple.com/app/1',
        android: 'https://play.google.com/store/apps/details?id=x',
        geo: [{ country: 'DE', url: 'https://example.de/' }],
      },
    }),
  })
  const urlFor = (visitor: Visitor) => {
    const decision = RedirectRules.decide(targeted, { now: NOW, visitor })
    return decision.type === 'redirect' ? decision.url : null
  }

  test('device rules win over country rules', () => {
    expect(urlFor(new Visitor('Mozilla/5.0 (iPhone; CPU iPhone OS 19_0)', 'DE', null))).toBe('https://apps.apple.com/app/1?utm_source=qr')
    expect(urlFor(new Visitor('Mozilla/5.0 (Linux; Android 15)', null, null))).toBe(
      'https://play.google.com/store/apps/details?id=x&utm_source=qr',
    )
  })

  test('country rules, then the main destination', () => {
    expect(urlFor(new Visitor('Mozilla/5.0 (Macintosh)', 'DE', null))).toBe('https://example.de/?utm_source=qr')
    expect(urlFor(new Visitor('Mozilla/5.0 (Macintosh)', 'FR', null))).toBe('https://example.com/main?utm_source=qr')
    expect(urlFor(Visitor.ANONYMOUS)).toBe('https://example.com/main?utm_source=qr')
  })
})

describe('social preview and cloaking', () => {
  const BOT = new Visitor('Slackbot-LinkExpanding 1.0', null, null)
  const PERSON = new Visitor('Mozilla/5.0 (Macintosh)', null, null)
  const preview = { title: 'Spring launch', imageUrl: '/api/media/previews/o1/abc.png' }

  test('crawlers get the card, people get the destination', () => {
    const shared = row({ title: 'Launch', deliveryJson: JSON.stringify({ socialPreview: preview }) })
    expect(RedirectRules.decide(shared, { now: NOW, visitor: BOT })).toEqual({ type: 'preview', preview, title: 'Launch' })
    expect(RedirectRules.decide(shared, { now: NOW, visitor: PERSON }).type).toBe('redirect')
  })

  test('the card is served even before the password form; without one crawlers follow the rules', () => {
    const locked = row({ passwordHash: 'x', deliveryJson: JSON.stringify({ socialPreview: preview }) })
    expect(RedirectRules.decide(locked, { now: NOW, visitor: BOT }).type).toBe('preview')
    expect(RedirectRules.decide(row({ passwordHash: 'x' }), { now: NOW, visitor: BOT }).type).toBe('password_required')
  })

  test('cloaked links frame the chosen destination and count the click', () => {
    const cloaked = row({ deliveryJson: JSON.stringify({ cloaked: true }) })
    expect(RedirectRules.decide(cloaked, { now: NOW, visitor: PERSON })).toEqual({
      type: 'cloak',
      url: 'https://example.com/page',
      title: 'example.com',
      countsClick: true,
    })
  })
})
