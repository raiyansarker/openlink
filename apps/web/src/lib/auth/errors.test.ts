import { describe, expect, test } from 'bun:test'

import { authErrorMessage } from './errors'

describe('authErrorMessage', () => {
  test('known Better Auth codes get fixed wording', () => {
    expect(authErrorMessage({ code: 'INVALID_PASSWORD', status: 400, message: 'Invalid password' }, 'x')).toBe(
      'Your current password is incorrect.',
    )
    expect(authErrorMessage({ code: 'SESSION_EXPIRED', status: 400 }, 'x')).toContain('sign in again')
  })

  test('our own 400 messages (from the profile rules) are shown as-is', () => {
    const message = authErrorMessage({ status: 400, message: 'You own Acme. Transfer ownership or delete it before deleting your account.' }, 'x')
    expect(message).toContain('You own Acme')
  })

  test('rate limits and anything else get safe fallbacks', () => {
    expect(authErrorMessage({ status: 429 }, 'x')).toContain('Too many attempts')
    expect(authErrorMessage({ status: 500, message: 'SQLITE_ERROR' }, 'Could not save.')).toBe('Could not save.')
    expect(authErrorMessage(null, 'Fallback')).toBe('Fallback')
  })
})
