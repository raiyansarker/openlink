import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { hashLinkPassword, verifyLinkPassword } from './password'

describe('link password hashing', () => {
  test('hashLinkPassword uses PBKDF2 prefix and verifies', async () => {
    const stored = await hashLinkPassword('hunter2')
    expect(stored.startsWith('pbkdf2-sha256$')).toBe(true)
    expect(await verifyLinkPassword('hunter2', stored)).toBe(true)
    expect(await verifyLinkPassword('wrong', stored)).toBe(false)
  })

  test('verifyLinkPassword accepts legacy sha256 hex', async () => {
    const legacy = createHash('sha256').update('old-secret').digest('hex')
    expect(await verifyLinkPassword('old-secret', legacy)).toBe(true)
    expect(await verifyLinkPassword('nope', legacy)).toBe(false)
  })
})
