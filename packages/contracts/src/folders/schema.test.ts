import { type } from 'arktype'
import { describe, expect, test } from 'bun:test'
import { CreateFolderRequest, DeleteFolderQuery, UpdateFolderRequest } from './schema'

describe('folder requests', () => {
  test('parentId may be a string, null (root), or omitted', () => {
    expect(CreateFolderRequest({ name: 'Docs' })).toEqual({ name: 'Docs' })
    expect(CreateFolderRequest({ name: 'Docs', parentId: null })).toEqual({ name: 'Docs', parentId: null })
    expect(CreateFolderRequest({ name: 'Docs', parentId: 'f1' })).toEqual({ name: 'Docs', parentId: 'f1' })
    expect(CreateFolderRequest({ name: 'Docs', parentId: 3 })).toBeInstanceOf(type.errors)
  })

  test('updates can move to the root with null', () => {
    expect(UpdateFolderRequest({ parentId: null })).toEqual({ parentId: null })
  })

  test('delete mode only accepts known values', () => {
    expect(DeleteFolderQuery({ mode: 'cascade' })).toEqual({ mode: 'cascade' })
    expect(DeleteFolderQuery({ mode: 'nuke' })).toBeInstanceOf(type.errors)
    expect(DeleteFolderQuery({})).toEqual({})
  })
})
