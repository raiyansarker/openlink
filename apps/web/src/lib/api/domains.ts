import type { WorkspaceCustomDomain } from '#/data/demo/domains'
import { DEFAULT_DOMAIN_TARGET } from '@openlink/contracts'
import { ApiClient, type OpenLinkClient } from './client'
import { ApiError } from './error'

type DomainDto = Awaited<ReturnType<OpenLinkClient['domains']['getDomain']>>

export class DomainMapper {
  static toUi(row: DomainDto): WorkspaceCustomDomain {
    return {
      id: row.id,
      orgId: row.organizationId,
      hostname: row.hostname,
      // The UI has no separate "removing" state; it reads as still being set up.
      readiness: row.readiness === 'removing' ? 'pending' : row.readiness,
      linkCount: row.linkCount,
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

  /**
   * Removes a domain. `moveLinksTo` moves its links first (a domain id, or
   * `null` for the app's own host); without it the links are deleted too.
   */
  remove(organizationId: string, domainId: string, moveLinksTo?: string | null) {
    const query = moveLinksTo === undefined ? {} : { moveLinksTo: moveLinksTo ?? DEFAULT_DOMAIN_TARGET }
    return this.call(
      () => this.client.domains.removeDomain({ params: { organizationId, domainId }, query }),
      'Could not remove the domain.',
    )
  }

  private async call<T>(run: () => Promise<T>, fallback: string): Promise<T> {
    try {
      return await run()
    } catch (error) {
      throw ApiError.from(error, fallback)
    }
  }
}
