import { describe, expect, test } from 'bun:test'

import { ProfileError } from './api'

describe('ProfileError.from', () => {
  test('known Better Auth codes get fixed wording', () => {
    expect(ProfileError.from({ code: 'INVALID_PASSWORD', status: 400, message: 'Invalid password' }, 'x').message).toBe(
      'Your current password is incorrect.',
    )
    expect(ProfileError.from({ code: 'SESSION_EXPIRED', status: 400 }, 'x').message).toContain('sign in again')
  })

  test('our own 400 messages (from the profile rules) are shown as-is', () => {
    const error = ProfileError.from({ status: 400, message: 'You own Acme. Transfer ownership or delete it before deleting your account.' }, 'x')
    expect(error.message).toContain('You own Acme')
  })

  test('rate limits and anything else get safe fallbacks', () => {
    expect(ProfileError.from({ status: 429 }, 'x').message).toContain('Too many attempts')
    expect(ProfileError.from({ status: 500, message: 'SQLITE_ERROR' }, 'Could not save.').message).toBe('Could not save.')
    expect(ProfileError.from(null, 'Fallback').message).toBe('Fallback')
  })
})
