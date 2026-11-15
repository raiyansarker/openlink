import { type } from 'arktype'
import { describe, expect, test } from 'bun:test'
import { ActivityEvent, ListActivityQuery } from './schema'

const event = {
  id: 'e1', organizationId: 'o1', action: 'link.created', phrase: 'created link', category: 'links',
  source: 'dashboard', actor: { type: 'member', label: 'Ada', userId: 'u1' },
  target: { type: 'link', id: 'l1', label: 'launch' }, occurredAt: '2026-01-01T00:00:00.000Z',
}

describe('activity schemas', () => {
  test('accepts a feed event with optional changes and ip', () => {
    expect(ActivityEvent(event)).toEqual(event)
    expect(ActivityEvent({ ...event, changes: [{ label: 'Title', from: 'a', to: 'b' }], ipAddress: '203.0.113.1' })).not.toBeInstanceOf(type.errors)
  })

  test('rejects unknown categories and sources', () => {
    expect(ActivityEvent({ ...event, category: 'billing' })).toBeInstanceOf(type.errors)
    expect(ActivityEvent({ ...event, source: 'cli' })).toBeInstanceOf(type.errors)
  })

  test('query parses the numeric limit', () => {
    expect(ListActivityQuery({ category: 'domains', limit: '25' })).toEqual({ category: 'domains', limit: 25 })
    expect(ListActivityQuery({ limit: 'many' })).toBeInstanceOf(type.errors)
  })
})
