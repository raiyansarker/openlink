import { describe, expect, test } from 'bun:test'
import { API_KEY_PREFIX, generateApiKey, hashApiKey, readBearerApiKey } from './secret'

describe('generateApiKey', () => {
  test('produces a prefixed secret whose display prefix and hash match it', () => {
    const { secret, prefix, hash } = generateApiKey()
    expect(secret.startsWith(API_KEY_PREFIX)).toBe(true)
    expect(secret.length).toBeGreaterThanOrEqual(API_KEY_PREFIX.length + 32)
    expect(prefix).toBe(secret.slice(0, API_KEY_PREFIX.length + 4))
    expect(hash).toBe(hashApiKey(secret))
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(hash).not.toContain(secret)
  })

  test('never repeats', () => {
    const secrets = new Set(Array.from({ length: 200 }, () => generateApiKey().secret))
    expect(secrets.size).toBe(200)
  })
})

describe('readBearerApiKey', () => {
  test('accepts only bearer tokens carrying the OpenLink prefix', () => {
    expect(readBearerApiKey('Bearer ol_live_abc')).toBe('ol_live_abc')
    expect(readBearerApiKey('bearer   ol_live_abc ')).toBe('ol_live_abc')
    expect(readBearerApiKey('Bearer sk_other')).toBeNull()
    expect(readBearerApiKey('Basic ol_live_abc')).toBeNull()
    expect(readBearerApiKey('Bearer ol_live_a b')).toBeNull()
    expect(readBearerApiKey('Bearer')).toBeNull()
    expect(readBearerApiKey(null)).toBeNull()
  })
})
