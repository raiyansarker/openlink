import { describe, expect, test } from 'bun:test'
import type { link } from '@openlink/db/schema'
import { ACTION_DEFINITIONS, diffLink, isKnownAction, linkUpdateAction } from './actions'

const now = new Date('2026-01-01T00:00:00Z')
const row = (overrides: Partial<typeof link.$inferSelect> = {}): typeof link.$inferSelect => ({
  id: 'l1', organizationId: 'o1', domainId: 'd1', folderId: null, slug: 's', alias: null, title: null,
  description: null, destinationUrl: 'https://example.com', status: 'active',
  enabled: true, activateAt: null, expiresAt: null, maxClicks: null, clickCount: 0, passwordHash: null,
  expiredDestinationUrl: null, fallbackDestinationUrl: null, tagsJson: '[]', utmJson: null,
  metadataJson: null, deliveryJson: null, createdByUserId: null, createdAt: now, updatedAt: now, ...overrides,
})

describe('diffLink', () => {
  test('is empty when nothing tracked changed', () => {
    expect(diffLink(row(), row({ updatedAt: new Date(), clickCount: 99 }))).toEqual([])
  })

  test('lists changed fields with before and after values', () => {
    const changes = diffLink(
      row(),
      row({ destinationUrl: 'https://example.com/new', title: 'Hi', tagsJson: '["a","b"]' }),
    )
    expect(changes).toEqual([
      { label: 'Destination', from: 'https://example.com', to: 'https://example.com/new' },
      { label: 'Title', from: '—', to: 'Hi' },
      { label: 'Tags', from: '—', to: 'a, b' },
    ])
  })

  test('records that a password changed without revealing it', () => {
    const changes = diffLink(row(), row({ passwordHash: 'pbkdf2$secret' }))
    expect(changes).toEqual([{ label: 'Password', from: 'none', to: 'set' }])
    expect(JSON.stringify(changes)).not.toContain('secret')
  })

  test('formats dates as ISO strings', () => {
    const changes = diffLink(row(), row({ expiresAt: new Date('2027-01-01T00:00:00Z') }))
    expect(changes).toEqual([{ label: 'Expires', from: '—', to: '2027-01-01T00:00:00.000Z' }])
  })
})

describe('linkUpdateAction', () => {
  test('narrows folder-only and tag-only edits', () => {
    expect(linkUpdateAction([{ label: 'Folder', from: '—', to: 'f1' }])).toBe('link.moved')
    expect(linkUpdateAction([{ label: 'Tags', from: '—', to: 'a' }])).toBe('link.tagged')
    expect(linkUpdateAction([{ label: 'Title', from: 'a', to: 'b' }])).toBe('link.updated')
    expect(linkUpdateAction([{ label: 'Folder', from: '—', to: 'f1' }, { label: 'Tags', from: '—', to: 'a' }])).toBe('link.updated')
  })

  test('a hold-only edit is held or released', () => {
    expect(linkUpdateAction([{ label: 'Hold', from: '—', to: '{"page":"maintenance"}' }])).toBe('link.held')
    expect(linkUpdateAction([{ label: 'Hold', from: '{"page":"maintenance"}', to: '—' }])).toBe('link.released')
  })
})

describe('action definitions', () => {
  test('every action has a category and phrase', () => {
    for (const [action, definition] of Object.entries(ACTION_DEFINITIONS)) {
      expect(isKnownAction(action)).toBe(true)
      expect(definition.phrase.length).toBeGreaterThan(0)
    }
    expect(isKnownAction('nope')).toBe(false)
  })
})
