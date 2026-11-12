import { describe, expect, test } from 'bun:test'
import { contract } from './contract'

describe('oRPC OpenAPI contract', () => {
  test('groups procedures by domain', () => {
    expect(contract.system.getHealth).toBeDefined()
    expect(contract.system.getOpenApiDocument).toBeDefined()
    expect(contract.auth.signIn).toBeDefined()
    expect(contract.organizations.listOrganizations).toBeDefined()
    expect(contract.links.createLink).toBeDefined()
  })

  test('covers organization, domain, and link surfaces', () => {
    expect(contract.organizations.getOrganization).toBeDefined()
    expect(contract.domains.addDomain).toBeDefined()
    expect(contract.domains.refreshDomainStatus).toBeDefined()
    expect(contract.links.updateLink).toBeDefined()
  })
})
