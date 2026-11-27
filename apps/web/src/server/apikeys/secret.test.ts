import { describe, expect, test } from 'bun:test'
import { readBearerApiKey } from './secret'

describe('readBearerApiKey', () => {
  test('accepts only bearer tokens carrying the OpenLink prefix', () => {
    expect(readBearerApiKey('Bearer sk_abc')).toBe('sk_abc')
    expect(readBearerApiKey('bearer   sk_abc ')).toBe('sk_abc')
    expect(readBearerApiKey('Bearer ol_old_key')).toBeNull()
    expect(readBearerApiKey('Basic sk_abc')).toBeNull()
    expect(readBearerApiKey('Bearer sk_a b')).toBeNull()
    expect(readBearerApiKey('Bearer')).toBeNull()
    expect(readBearerApiKey(null)).toBeNull()
  })
})
