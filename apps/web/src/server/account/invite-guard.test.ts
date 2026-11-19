import { describe, expect, test } from 'bun:test'
import { Effect } from 'effect'
import { createTestDatabase } from '../testing/sqlite'
import { checkInvitee } from './invite-guard'

describe('checkInvitee', () => {
  test('an unverified address cannot see or answer invites', async () => {
    const { db } = createTestDatabase()
    expect(await Effect.runPromise(checkInvitee(db, { id: 'u1', emailVerified: false }))).toBe('not_found')
  })

  test('twenty invite actions a minute per person, then refused', async () => {
    const { db } = createTestDatabase()
    const results: (string | null)[] = []
    for (let i = 0; i < 21; i++) results.push(await Effect.runPromise(checkInvitee(db, { id: 'u1', emailVerified: true })))
    expect(results.slice(0, 20).every((r) => r === null)).toBe(true)
    expect(results[20]).toBe('rate_limited')
    // Someone else is unaffected.
    expect(await Effect.runPromise(checkInvitee(db, { id: 'u2', emailVerified: true }))).toBeNull()
  })
})
