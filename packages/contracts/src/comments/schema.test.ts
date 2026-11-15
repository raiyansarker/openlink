import { type } from 'arktype'
import { describe, expect, test } from 'bun:test'
import { CommentBody, MAX_COMMENT_LENGTH, ToggleReactionRequest } from './schema'

describe('comment requests', () => {
  test('bodies must be non-empty and bounded', () => {
    expect(CommentBody({ body: 'hi' })).toEqual({ body: 'hi' })
    expect(CommentBody({ body: '' })).toBeInstanceOf(type.errors)
    expect(CommentBody({ body: 'x'.repeat(MAX_COMMENT_LENGTH) })).not.toBeInstanceOf(type.errors)
    expect(CommentBody({ body: 'x'.repeat(MAX_COMMENT_LENGTH + 1) })).toBeInstanceOf(type.errors)
  })

  test('reactions need a short emoji', () => {
    expect(ToggleReactionRequest({ emoji: '👍' })).toEqual({ emoji: '👍' })
    expect(ToggleReactionRequest({ emoji: '' })).toBeInstanceOf(type.errors)
    expect(ToggleReactionRequest({ emoji: 'x'.repeat(17) })).toBeInstanceOf(type.errors)
  })
})
