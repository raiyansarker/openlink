import { describe, expect, test } from 'bun:test'
import { MAX_TAGS_PER_LINK, mergeTags, normalizeTags, parseTags } from './tags'

describe('tags', () => {
  test('normalizeTags trims, collapses whitespace and drops empties and duplicates', () => {
    expect(normalizeTags(['  Launch ', 'launch', '', '  ', 'q4  plan', 'x'.repeat(51)])).toEqual(['Launch', 'q4 plan'])
  })

  test('mergeTags keeps existing tags first and caps the total', () => {
    expect(mergeTags(['a', 'b'], ['B', 'c'])).toEqual(['a', 'b', 'c'])
    const many = Array.from({ length: 30 }, (_, i) => `t${i}`)
    expect(mergeTags(['keep'], many)).toHaveLength(MAX_TAGS_PER_LINK)
    expect(mergeTags(['keep'], many)[0]).toBe('keep')
  })

  test('parseTags tolerates corrupt json and non-string values', () => {
    expect(parseTags('["a",2,"b"]')).toEqual(['a', 'b'])
    expect(parseTags('{bad')).toEqual([])
    expect(parseTags('{"a":1}')).toEqual([])
  })
})
