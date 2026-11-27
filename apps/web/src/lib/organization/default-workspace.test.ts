import { describe, expect, test } from 'bun:test'
import { defaultWorkspaceName, withRandomSuffix, workspaceSlugBase } from './default-workspace'

describe('defaultWorkspaceName', () => {
  test('uses the first name', () => {
    expect(defaultWorkspaceName('Raiyan Sarker')).toBe("Raiyan's workspace")
    expect(defaultWorkspaceName('  Ada  ')).toBe("Ada's workspace")
    expect(defaultWorkspaceName('রাইয়ান সরকার')).toBe("রাইয়ান's workspace")
  })

  test('falls back when there is no usable name', () => {
    for (const name of [null, undefined, '', '   ', '🙂']) expect(defaultWorkspaceName(name)).toBe('My workspace')
  })
})

describe('workspaceSlugBase', () => {
  test('slugifies the name, capped at 40 characters', () => {
    expect(workspaceSlugBase("Raiyan's workspace")).toBe('raiyans-workspace')
    expect(workspaceSlugBase('a'.repeat(60)).length).toBe(40)
    expect(workspaceSlugBase("রাইয়ান's workspace")).toBe('workspace')
    expect(workspaceSlugBase("José's workspace")).toBe('joses-workspace')
    expect(workspaceSlugBase('x')).toBe('workspace')
  })

  test('suffixes are five lowercase letters or digits', () => {
    expect(withRandomSuffix('acme')).toMatch(/^acme-[a-z0-9]{5}$/)
  })
})
