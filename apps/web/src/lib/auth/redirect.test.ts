import { describe, expect, test } from 'bun:test'
import { LoginRedirect } from './redirect'

const DEFAULT_AFTER_LOGIN = LoginRedirect.DEFAULT
const safeRedirectPath = LoginRedirect.sanitize

describe('LoginRedirect.sanitize', () => {
  test('keeps same-origin paths with query and hash', () => {
    expect(safeRedirectPath('/dashboard/acme/links?folder=f1#top')).toBe('/dashboard/acme/links?folder=f1#top')
    expect(safeRedirectPath('/settings/profile')).toBe('/settings/profile')
  })

  test.each([
    'https://evil.example/phish',
    '//evil.example',
    '/\\evil.example',
    '\\\\evil.example',
    'javascript:alert(1)',
    'dashboard',
    '',
    '/ok\nLocation: https://evil.example',
    '///evil.example',
  ])('rejects %p', (value) => {
    expect(safeRedirectPath(value)).toBe(DEFAULT_AFTER_LOGIN)
  })

  test('never loops back into login or the auth endpoints', () => {
    expect(safeRedirectPath('/login?redirect=/dashboard')).toBe(DEFAULT_AFTER_LOGIN)
    expect(safeRedirectPath('/api/auth/sign-out')).toBe(DEFAULT_AFTER_LOGIN)
  })

  test('rejects non-strings and honours a custom fallback', () => {
    expect(safeRedirectPath(undefined)).toBe(DEFAULT_AFTER_LOGIN)
    expect(safeRedirectPath(['/a'])).toBe(DEFAULT_AFTER_LOGIN)
    expect(safeRedirectPath('//x', '/home')).toBe('/home')
  })
})
