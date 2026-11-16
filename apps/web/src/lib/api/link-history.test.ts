import { describe, expect, test } from 'bun:test'

import { HistoryMapper } from './link-history'

const activity = (action: string, changes?: { label: string; from: string; to: string }[]) => ({
  id: 'e1',
  organizationId: 'o1',
  action,
  phrase: 'x',
  category: 'links' as const,
  source: 'dashboard' as const,
  actor: { type: 'member' as const, label: 'Ada', userId: 'u1' },
  target: { type: 'link', id: 'l1', label: 'Launch' },
  occurredAt: '2026-11-16T00:00:00.000Z',
  ...(changes ? { changes } : {}),
})

describe('HistoryMapper', () => {
  test('summarises edits by what changed', () => {
    expect(HistoryMapper.toUi(activity('link.updated', [{ label: 'Title', from: 'a', to: 'b' }]))).toMatchObject({
      type: 'updated',
      actor: 'Ada',
      summary: 'Changed title',
      changes: [{ label: 'Title', from: 'a', to: 'b' }],
    })
    expect(HistoryMapper.toUi(activity('link.updated', [{ label: 'A', from: '', to: '' }, { label: 'B', from: '', to: '' }]))?.summary).toBe(
      'Changed 2 settings',
    )
  })

  test('unrelated actions are skipped', () => {
    expect(HistoryMapper.toUi(activity('domain.added'))).toBeNull()
    expect(HistoryMapper.toUi(activity('link.commented'))).toBeNull()
  })
})
