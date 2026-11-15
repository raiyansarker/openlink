import { describe, expect, test } from 'bun:test'
import {
  MAX_FOLDER_DEPTH,
  canCreateFolderIn,
  canMoveFolder,
  descendantIds,
  folderPath,
  hasNameClash,
  normalizeFolderName,
  uniqueSiblingName,
  type FolderNode,
} from './rules'

const tree: FolderNode[] = [
  { id: 'a', parentId: null, name: 'Docs' },
  { id: 'b', parentId: 'a', name: 'Guides' },
  { id: 'c', parentId: 'b', name: 'Intro' },
  { id: 'd', parentId: null, name: 'Marketing' },
]

const chain = (length: number): FolderNode[] =>
  Array.from({ length }, (_, i) => ({ id: `n${i}`, parentId: i === 0 ? null : `n${i - 1}`, name: `n${i}` }))

describe('folder tree', () => {
  test('folderPath walks to the root and survives unknown ids and cycles', () => {
    expect(folderPath(tree, 'c').map((f) => f.id)).toEqual(['a', 'b', 'c'])
    expect(folderPath(tree, null)).toEqual([])
    expect(folderPath(tree, 'nope')).toEqual([])
    const cyclic: FolderNode[] = [
      { id: 'x', parentId: 'y', name: 'x' },
      { id: 'y', parentId: 'x', name: 'y' },
    ]
    expect(folderPath(cyclic, 'x').length).toBe(2)
  })

  test('descendantIds excludes the folder itself', () => {
    expect([...descendantIds(tree, 'a')].sort()).toEqual(['b', 'c'])
    expect(descendantIds(tree, 'c').size).toBe(0)
  })
})

describe('moving folders', () => {
  test('rejects moving into itself or its own descendants', () => {
    expect(canMoveFolder(tree, 'a', 'a')).toBe(false)
    expect(canMoveFolder(tree, 'a', 'c')).toBe(false)
  })

  test('allows moving to the root or a sibling branch', () => {
    expect(canMoveFolder(tree, 'b', null)).toBe(true)
    expect(canMoveFolder(tree, 'c', 'd')).toBe(true)
  })

  test('enforces the depth cap including the moved subtree', () => {
    const deep = chain(MAX_FOLDER_DEPTH)
    const loose: FolderNode[] = [
      { id: 'p', parentId: null, name: 'p' },
      { id: 'q', parentId: 'p', name: 'q' },
    ]
    const all = [...deep, ...loose]
    expect(canMoveFolder(all, 'p', `n${MAX_FOLDER_DEPTH - 1}`)).toBe(false)
    expect(canMoveFolder(all, 'p', `n${MAX_FOLDER_DEPTH - 3}`)).toBe(true)
    expect(canMoveFolder(all, 'p', `n${MAX_FOLDER_DEPTH - 2}`)).toBe(false)
  })

  test('creation is capped at the maximum depth', () => {
    const deep = chain(MAX_FOLDER_DEPTH)
    expect(canCreateFolderIn(deep, `n${MAX_FOLDER_DEPTH - 2}`)).toBe(true)
    expect(canCreateFolderIn(deep, `n${MAX_FOLDER_DEPTH - 1}`)).toBe(false)
    expect(canCreateFolderIn(deep, null)).toBe(true)
  })
})

describe('names', () => {
  test('trims and validates', () => {
    expect(normalizeFolderName('  Docs ')).toEqual({ ok: true, name: 'Docs' })
    expect(normalizeFolderName('   ')).toMatchObject({ ok: false })
    expect(normalizeFolderName('a/b')).toMatchObject({ ok: false })
    expect(normalizeFolderName('x'.repeat(121))).toMatchObject({ ok: false })
    expect(normalizeFolderName('x'.repeat(120))).toMatchObject({ ok: true })
  })

  test('clashes are case-insensitive among siblings only', () => {
    expect(hasNameClash(tree, 'docs', null)).toBe(true)
    expect(hasNameClash(tree, 'docs', 'a')).toBe(false)
    expect(hasNameClash(tree, 'DOCS', null, 'a')).toBe(false)
  })

  test('uniqueSiblingName suffixes until free', () => {
    expect(uniqueSiblingName(new Set(['guides']), 'Guides')).toBe('Guides (2)')
    expect(uniqueSiblingName(new Set(['guides', 'guides (2)']), 'Guides')).toBe('Guides (3)')
    expect(uniqueSiblingName(new Set(), 'Guides')).toBe('Guides')
  })
})
