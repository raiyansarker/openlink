import { describe, expect, test } from 'bun:test'
import {
  MAX_COMMENT_LENGTH,
  MAX_REACTION_KINDS,
  excerpt,
  normalizeCommentBody,
  parseReactions,
  toggleReaction,
} from './rules'

describe('comment bodies', () => {
  test('are trimmed and bounded', () => {
    expect(normalizeCommentBody('  hi  ')).toBe('hi')
    expect(normalizeCommentBody('   ')).toBeNull()
    expect(normalizeCommentBody('x'.repeat(MAX_COMMENT_LENGTH))).not.toBeNull()
    expect(normalizeCommentBody('x'.repeat(MAX_COMMENT_LENGTH + 1))).toBeNull()
  })
})

describe('reactions', () => {
  test('toggle adds, then removes, and drops empty emoji', () => {
    const added = toggleReaction({}, '👍', 'u1')
    expect(added).toEqual({ '👍': ['u1'] })
    expect(toggleReaction(added!, '👍', 'u2')).toEqual({ '👍': ['u1', 'u2'] })
    expect(toggleReaction(added!, '👍', 'u1')).toEqual({})
  })

  test('toggling one user leaves others and other emoji intact', () => {
    const start = { '👍': ['u1', 'u2'], '🎉': ['u1'] }
    expect(toggleReaction(start, '👍', 'u1')).toEqual({ '👍': ['u2'], '🎉': ['u1'] })
  })

  test('refuses a new kind past the limit but still allows existing ones', () => {
    const full = Object.fromEntries(Array.from({ length: MAX_REACTION_KINDS }, (_, i) => [`e${i}`, ['u1']]))
    expect(toggleReaction(full, 'new', 'u1')).toBeNull()
    expect(toggleReaction(full, 'e0', 'u2')).not.toBeNull()
    expect(toggleReaction(full, 'e0', 'u1')).not.toBeNull()
  })

  test('parseReactions tolerates corrupt data', () => {
    expect(parseReactions('{"👍":["u1",3]}')).toEqual({ '👍': ['u1'] })
    expect(parseReactions('[1]')).toEqual({})
    expect(parseReactions('nope')).toEqual({})
    expect(parseReactions('{"a":"b"}')).toEqual({})
  })
})

describe('excerpt', () => {
  test('flattens whitespace and truncates with an ellipsis', () => {
    expect(excerpt('hello\n\nworld')).toBe('hello world')
    const long = excerpt('word '.repeat(40), 20)
    expect(long.length).toBeLessThanOrEqual(20)
    expect(long.endsWith('…')).toBe(true)
  })
})
