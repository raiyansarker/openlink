import { describe, expect, test } from 'bun:test'

import { CommentMapper, HistoryMapper } from './link-thread'

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

  test('comments quote their excerpt; unrelated actions are skipped', () => {
    expect(HistoryMapper.toUi(activity('link.commented', [{ label: 'Comment', from: '—', to: 'Ship it' }]))).toMatchObject({
      type: 'commented',
      excerpt: 'Ship it',
    })
    expect(HistoryMapper.toUi(activity('domain.added'))).toBeNull()
  })
})

describe('CommentMapper', () => {
  test('keeps author, reactions and edits', () => {
    expect(
      CommentMapper.toUi({
        id: 'c1',
        linkId: 'l1',
        authorId: null,
        authorName: 'Former member',
        body: 'Hi',
        createdAt: '2026-11-16T00:00:00.000Z',
        editedAt: '2026-11-16T01:00:00.000Z',
        reactions: { '👍': ['u2'] },
      }),
    ).toEqual({
      id: 'c1',
      at: '2026-11-16T00:00:00.000Z',
      authorId: '',
      authorName: 'Former member',
      body: 'Hi',
      editedAt: '2026-11-16T01:00:00.000Z',
      reactions: { '👍': ['u2'] },
    })
  })
})
