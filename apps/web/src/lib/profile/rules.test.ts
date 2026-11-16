import { describe, expect, test } from 'bun:test'

import { ProfileRules } from './rules'

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

describe('ProfileRules.providerImage', () => {
  test('keeps https pictures from Google or GitHub', () => {
    expect(ProfileRules.providerImage('https://avatars.githubusercontent.com/u/1?v=4')).toBe('https://avatars.githubusercontent.com/u/1?v=4')
  })

  test.each([
    'http://example.com/a.png',
    'javascript:alert(1)',
    'data:image/png;base64,iVBORw0KGgo=',
    'not a url',
    null,
    42,
  ])('drops %p', (value) => {
    expect(ProfileRules.providerImage(value)).toBeNull()
  })

  test('drops absurdly long URLs', () => {
    expect(ProfileRules.providerImage(`https://e.com/${'a'.repeat(2100)}`)).toBeNull()
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
