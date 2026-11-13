import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { Effect } from 'effect'
import { hashLinkPassword, verifyLinkPassword } from './password'

const verify = (password: string, stored: string | null | undefined) =>
  Effect.runPromise(verifyLinkPassword(password, stored))

describe('link password hashing', () => {
  test('hashing is lazy and uses the PBKDF2 prefix', async () => {
    const effect = hashLinkPassword('hunter2')
    const stored = await Effect.runPromise(effect)
    expect(stored.startsWith('pbkdf2-sha256$')).toBe(true)
    expect(await verify('hunter2', stored)).toBe(true)
    expect(await verify('wrong', stored)).toBe(false)
    expect(await Effect.runPromise(effect)).not.toBe(stored)
  })

  test('verification rejects missing or malformed hashes', async () => {
    expect(await verify('x', null)).toBe(false)
    expect(await verify('x', 'pbkdf2-sha256$nope')).toBe(false)
  })

  test('verifyLinkPassword accepts legacy sha256 hex', async () => {
    const legacy = createHash('sha256').update('old-secret').digest('hex')
    expect(await verify('old-secret', legacy)).toBe(true)
    expect(await verify('nope', legacy)).toBe(false)
  })
})
