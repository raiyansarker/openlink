import { describe, expect, test } from 'bun:test'
import { contract } from './openapi-contract'

describe('oRPC OpenAPI contract', () => {
  test('defines core system and auth procedures with HTTP routes', () => {
    expect(contract.getHealth).toBeDefined()
    expect(contract.getOpenApiDocument).toBeDefined()
    expect(contract.signIn).toBeDefined()
    expect(contract.listOrganizations).toBeDefined()
    expect(contract.createLink).toBeDefined()
  })

  test('covers organization, domain, and link surfaces', () => {
    expect(contract.getOrganization).toBeDefined()
    expect(contract.addDomain).toBeDefined()
    expect(contract.refreshDomainStatus).toBeDefined()
    expect(contract.updateLink).toBeDefined()
  })
})
