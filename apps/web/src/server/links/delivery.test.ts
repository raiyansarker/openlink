import { describe, expect, test } from 'bun:test'

import { createTestDatabase } from '#/server/testing/sqlite'
import { LinkDelivery } from './delivery'

describe('LinkDelivery', () => {
  test('round-trips settings and reads nothing set as null', () => {
    const delivery = LinkDelivery.from({ hold: { page: 'maintenance' }, cloaked: true })
    expect(LinkDelivery.fromJson(delivery.toJson()).toDto()).toEqual({ hold: { page: 'maintenance' }, cloaked: true })
    expect(LinkDelivery.from({ cloaked: false, socialPreview: {}, targeting: { geo: [] } }).toJson()).toBeNull()
  })

  test('bad or outdated JSON reads as no settings', () => {
    expect(LinkDelivery.fromJson('{nope').toDto()).toEqual({})
    expect(LinkDelivery.fromJson(JSON.stringify({ hold: { page: 'teapot' } })).toDto()).toEqual({})
  })

  test('a patch keeps undefined fields and clears null ones', () => {
    const start = LinkDelivery.from({ hold: { page: 'bad-gateway' }, targeting: { ios: 'https://apps.apple.com/x' } })
    const next = start.apply({ hold: null, cloaked: true })
    expect(next.toDto()).toEqual({ targeting: { ios: 'https://apps.apple.com/x' }, cloaked: true })
  })
})

describe('migration 0010', () => {
  test('moves editor settings out of metadata into delivery_json', () => {
    const { sqlite } = createTestDatabase()
    // Re-run just the data move on rows shaped like the old editor wrote them.
    const insert = sqlite.prepare(
      `INSERT INTO link (id, organization_id, slug, destination_url, created_at, updated_at, metadata_json)
       VALUES (?, 'o1', ?, 'https://example.com', 0, 0, ?)`,
    )
    insert.run('a', 'a', JSON.stringify({ team: 'growth', __openlink_ui: { cloaked: true } }))
    insert.run('b', 'b', JSON.stringify({ __openlink_ui: { hold: { page: 'maintenance' } } }))
    insert.run('c', 'c', JSON.stringify({ team: 'ops' }))
    sqlite.exec(`UPDATE link SET delivery_json = json_extract(metadata_json, '$.__openlink_ui'),
      metadata_json = nullif(json_remove(metadata_json, '$.__openlink_ui'), '{}')
      WHERE json_valid(metadata_json) AND json_type(metadata_json, '$.__openlink_ui') = 'object'`)
    const rows = sqlite.query('SELECT id, metadata_json, delivery_json FROM link ORDER BY id').all()
    expect(rows).toEqual([
      { id: 'a', metadata_json: '{"team":"growth"}', delivery_json: '{"cloaked":true}' },
      { id: 'b', metadata_json: null, delivery_json: '{"hold":{"page":"maintenance"}}' },
      { id: 'c', metadata_json: '{"team":"ops"}', delivery_json: null },
    ])
  })
})
