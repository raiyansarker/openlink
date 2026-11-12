import { describe, expect, test } from 'bun:test'
import { customDomain, link, organization, user } from './index'

describe('@openlink/db schema', () => {
  test('exports core tables', () => {
    expect(user).toBeDefined()
    expect(organization).toBeDefined()
    expect(customDomain).toBeDefined()
    expect(link).toBeDefined()
  })
})
