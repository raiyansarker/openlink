import { describe, expect, test } from 'bun:test'
import { AuthErrorMessages } from './error-messages'

const oauthErrorMessage = AuthErrorMessages.oauth
const emailSignInErrorMessage = AuthErrorMessages.emailSignIn

describe('oauthErrorMessage', () => {
  test('is null without an error and friendly for known codes', () => {
    expect(oauthErrorMessage(undefined)).toBeNull()
    expect(oauthErrorMessage('ACCESS_DENIED')).toBe('Sign-in was cancelled.')
    expect(oauthErrorMessage('account_not_linked')).toContain('already exists')
  })

  test('unknown codes get a generic message and are never echoed', () => {
    const message = oauthErrorMessage('<script>alert(1)</script>')
    expect(message).toBe('Sign-in failed. Please try again.')
  })
})

describe('emailSignInErrorMessage', () => {
  test('does not distinguish unknown emails from wrong passwords', () => {
    expect(emailSignInErrorMessage({ status: 401, code: 'INVALID_EMAIL_OR_PASSWORD' })).toBe('Incorrect email or password.')
    expect(emailSignInErrorMessage({ status: 400, code: 'USER_NOT_FOUND' })).toBe('Incorrect email or password.')
  })

  test('separates rate limits and server failures', () => {
    expect(emailSignInErrorMessage({ status: 429 })).toContain('Too many attempts')
    expect(emailSignInErrorMessage({ status: 503 })).toContain('unavailable')
    expect(emailSignInErrorMessage(null)).toBe('Sign-in failed. Please try again.')
  })

  test('a refused request (403) is not reported as a wrong password', () => {
    expect(emailSignInErrorMessage({ status: 403 })).toContain('blocked')
    expect(emailSignInErrorMessage({ status: 401 })).toBe('Incorrect email or password.')
  })
})
