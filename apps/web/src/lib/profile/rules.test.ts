import { describe, expect, test } from 'bun:test'

import { ProfileRules } from './rules'

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

describe('ProfileRules.name', () => {
  test('trims and collapses whitespace', () => {
    expect(ProfileRules.name('  Ada   Lovelace ')).toEqual({ ok: true, value: 'Ada Lovelace' })
  })

  test('rejects empty, non-string and overlong names', () => {
    expect(ProfileRules.name('   ')).toMatchObject({ ok: false })
    expect(ProfileRules.name(undefined)).toMatchObject({ ok: false })
    expect(ProfileRules.name('x'.repeat(101))).toMatchObject({ ok: false })
    expect(ProfileRules.name('x'.repeat(100))).toMatchObject({ ok: true })
  })
})

describe('ProfileRules.image', () => {
  test('accepts none, https URLs, and small raster data URLs', () => {
    expect(ProfileRules.image(null)).toEqual({ ok: true, value: null })
    expect(ProfileRules.image('')).toEqual({ ok: true, value: null })
    expect(ProfileRules.image('https://avatars.githubusercontent.com/u/1?v=4')).toEqual({
      ok: true,
      value: 'https://avatars.githubusercontent.com/u/1?v=4',
    })
    expect(ProfileRules.image(PNG)).toEqual({ ok: true, value: PNG })
  })

  test.each([
    'http://example.com/a.png',
    'javascript:alert(1)',
    'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
    'data:text/html;base64,PGgxPmhpPC9oMT4=',
    'data:image/png;base64,not base64!',
    'data:image/png,rawdata',
    'ftp://example.com/a.png',
    'not a url',
  ])('rejects %p', (value) => {
    expect(ProfileRules.image(value)).toMatchObject({ ok: false })
  })

  test('rejects oversized uploads and non-strings', () => {
    const big = `data:image/png;base64,${'A'.repeat(ProfileRules.AVATAR_DATA_URL_MAX)}`
    expect(ProfileRules.image(big)).toMatchObject({ ok: false, message: expect.stringContaining('too large') })
    expect(ProfileRules.image(42)).toMatchObject({ ok: false })
    expect(ProfileRules.image(`https://e.com/${'a'.repeat(2100)}`)).toMatchObject({ ok: false })
  })
})

describe('ProfileRules.newPassword', () => {
  const ok = { current: 'old-password', next: 'new-password-1', confirm: 'new-password-1' }

  test('accepts a valid change', () => {
    expect(ProfileRules.newPassword(ok)).toBeNull()
  })

  test('explains each problem', () => {
    expect(ProfileRules.newPassword({ ...ok, next: 'short', confirm: 'short' })).toContain('at least 8')
    expect(ProfileRules.newPassword({ ...ok, confirm: 'different' })).toContain('do not match')
    expect(ProfileRules.newPassword({ current: 'same-pass', next: 'same-pass', confirm: 'same-pass' })).toContain('different')
    const long = 'x'.repeat(129)
    expect(ProfileRules.newPassword({ ...ok, next: long, confirm: long })).toContain('128')
  })
})
