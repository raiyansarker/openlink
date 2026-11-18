import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import type { Workspace } from '#/lib/api/types'
import { ActiveWorkspace } from './org-slug'

const org = (slug: string): Workspace => ({ id: `id-${slug}`, name: slug, slug, role: 'owner', createdAt: '2026-01-01T00:00:00.000Z' })
const orgs = [org('acme'), org('other'), org('third')]

const store = new Map<string, string>()
const globals = globalThis as unknown as { window?: unknown }

beforeEach(() => {
  store.clear()
  globals.window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    },
  }
})
afterEach(() => {
  delete globals.window
})

describe('ActiveWorkspace.pick', () => {
  test('an explicit slug must match; it never falls back to another workspace', () => {
    expect(ActiveWorkspace.pick(orgs, 'other')?.slug).toBe('other')
    expect(ActiveWorkspace.pick(orgs, 'not-mine')).toBeNull()
  })

  test('without a slug it prefers the remembered workspace, then the first', () => {
    expect(ActiveWorkspace.pick(orgs)?.slug).toBe('acme')
    ActiveWorkspace.remember('third')
    expect(ActiveWorkspace.pick(orgs)?.slug).toBe('third')
  })

  test('a remembered workspace the user no longer belongs to is ignored', () => {
    ActiveWorkspace.remember('removed')
    expect(ActiveWorkspace.pick(orgs)?.slug).toBe('acme')
  })

  test('no workspaces means nothing to pick', () => {
    expect(ActiveWorkspace.pick([])).toBeNull()
    expect(ActiveWorkspace.pick([], 'acme')).toBeNull()
  })

  test('malformed stored values are ignored', () => {
    store.set(ActiveWorkspace.STORAGE_KEY, 'Not A Slug!')
    expect(ActiveWorkspace.remembered()).toBeNull()
  })

  test('works on the server where there is no window', () => {
    delete globals.window
    expect(ActiveWorkspace.remembered()).toBeNull()
    expect(() => ActiveWorkspace.remember('acme')).not.toThrow()
  })
})
