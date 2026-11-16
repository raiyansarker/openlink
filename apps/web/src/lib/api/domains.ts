import type { WorkspaceCustomDomain } from '#/data/demo/domains'
import { ApiClient, type OpenLinkClient } from './client'
import { ApiError } from './error'

type DomainDto = Awaited<ReturnType<OpenLinkClient['domains']['getDomain']>>

export class DomainMapper {
  static toUi(row: DomainDto, linkCount = 0): WorkspaceCustomDomain {
    return {
      id: row.id,
      orgId: row.organizationId,
      hostname: row.hostname,
      // The UI has no separate "removing" state; it reads as still being set up.
      readiness: row.readiness === 'removing' ? 'pending' : row.readiness,
      linkCount,
      createdAt: row.createdAt,
      ...(row.activeAt ? { activeAt: row.activeAt } : {}),
      dnsRecords: row.dnsRecords.map((r) => ({ ...r, status: r.status ?? 'required' })),
    }
  }
}

/** Custom domains of one workspace. Mutations throw `ApiError` with a message to show. */
export class DomainsApi {
  constructor(private readonly client: OpenLinkClient = ApiClient.instance) {}

  async list(organizationId: string): Promise<WorkspaceCustomDomain[]> {
    const { items } = await this.client.domains.listDomains({ params: { organizationId } })
    return items.map((row) => DomainMapper.toUi(row))
  }

  add(organizationId: string, hostname: string) {
    return this.call(
      async () => DomainMapper.toUi(await this.client.domains.addDomain({ params: { organizationId }, body: { hostname } })),
      'Could not add the domain.',
    )
  }

  /** Asks the server to re-check DNS and certificate state. */
  refresh(organizationId: string, domainId: string) {
    return this.call(
      async () => DomainMapper.toUi(await this.client.domains.refreshDomainStatus({ params: { organizationId, domainId } })),
      'Could not check the domain.',
    )
  }

  remove(organizationId: string, domainId: string) {
    return this.call(() => this.client.domains.removeDomain({ params: { organizationId, domainId } }), 'Could not remove the domain.')
  }

  private async call<T>(run: () => Promise<T>, fallback: string): Promise<T> {
    try {
      return await run()
    } catch (error) {
      throw ApiError.from(error, fallback)
    }
  }
}
