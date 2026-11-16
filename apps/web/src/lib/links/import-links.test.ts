import { describe, expect, test } from 'bun:test'

import type { ShortLink } from '#/data/demo/types'
import { linksToCsv } from '#/lib/settings/export-links'
import { previewImport } from './import-links'

const link = (slug: string, domainId: string | null, extra: Partial<ShortLink> = {}) =>
  ({
    id: `id-${slug}-${domainId}`,
    slug,
    domainId,
    title: slug,
    targetUrl: `https://example.com/${slug}`,
    status: 'active',
    clicks: 0,
    tags: [],
    createdAt: '2026-11-16T00:00:00.000Z',
    ...extra,
  }) as ShortLink

describe('previewImport', () => {
  test("a domain's export re-imports onto another domain, keeping back-halves, titles and tags", () => {
    const exported = linksToCsv([link('launch', 'old', { title: 'Spring launch', tags: ['campaign', 'social'] }), link('docs', 'old')])
    const preview = previewImport(exported, { links: [], folders: [], defaultFolderId: null, domainId: 'new' })
    expect(preview.ok).toBe(true)
    if (!preview.ok) return
    expect(preview.validCount).toBe(2)
    expect(preview.rows[0]!.draft).toMatchObject({
      domainId: 'new',
      slug: 'launch',
      title: 'Spring launch',
      destination: 'https://example.com/launch',
      tags: ['campaign', 'social'],
    })
  })

  test('back-halves are checked on the chosen domain only', () => {
    const csv = 'destination,slug\nhttps://example.com/a,launch\n'
    const existing = [link('launch', 'taken-here')]
    const onTaken = previewImport(csv, { links: existing, folders: [], defaultFolderId: null, domainId: 'taken-here' })
    const onOther = previewImport(csv, { links: existing, folders: [], defaultFolderId: null, domainId: 'free-here' })
    expect(onTaken.ok && onTaken.validCount).toBe(0)
    expect(onOther.ok && onOther.validCount).toBe(1)
  })

  test('without a domain, links go on the app host', () => {
    const preview = previewImport('destination\nhttps://example.com/a\n', { links: [], folders: [], defaultFolderId: null })
    expect(preview.ok && preview.rows[0]!.draft.domainId).toBe(null)
  })
})
