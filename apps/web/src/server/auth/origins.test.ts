import { describe, expect, test } from 'bun:test'

import { AuthOrigins } from './origins'

const base = 'https://app.example.com'

describe('AuthOrigins.trusted', () => {
  test('always includes the app origin', () => {
    expect(AuthOrigins.trusted({ BETTER_AUTH_URL: base })).toEqual([base])
  })

  test('adds extra origins, trimmed and de-duplicated', () => {
    expect(
      AuthOrigins.trusted({
        BETTER_AUTH_URL: base,
        BETTER_AUTH_TRUSTED_ORIGINS: ' http://localhost:3100 , https://preview.example.com,https://app.example.com ',
      }),
    ).toEqual([base, 'http://localhost:3100', 'https://preview.example.com'])
  })

  test('reduces entries to origins and drops anything unsafe or malformed', () => {
    expect(
      AuthOrigins.trusted({
        BETTER_AUTH_URL: `${base}/some/path`,
        BETTER_AUTH_TRUSTED_ORIGINS: 'javascript:alert(1),not a url,,ftp://files.example.com,https://ok.example.com/x?y=1',
      }),
    ).toEqual([base, 'https://ok.example.com'])
  })

  test('a missing or invalid app URL yields no origin rather than a wildcard', () => {
    expect(AuthOrigins.trusted({ BETTER_AUTH_URL: '' })).toEqual([])
    expect(AuthOrigins.trusted({ BETTER_AUTH_URL: '*', BETTER_AUTH_TRUSTED_ORIGINS: '*' })).toEqual([])
  })
})
