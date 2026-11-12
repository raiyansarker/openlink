import { createDomainClient } from '@opencoredev/domain-sdk'
import { cloudflareSaaS } from '@opencoredev/domain-sdk/cloudflare'
import { memoryProvider } from '@opencoredev/domain-sdk/testing'

export type DomainProviderMode = 'memory' | 'cloudflare'

export type OpenLinkDomainEnv = {
  DOMAIN_PROVIDER: DomainProviderMode
  CF_API_TOKEN?: string
  CF_ZONE_ID?: string
  CF_SAAS_CNAME_TARGET?: string
  CF_SAAS_CUSTOM_ORIGIN?: string
}

export function createOpenLinkDomainClient(env: OpenLinkDomainEnv) {
  const mode = env.DOMAIN_PROVIDER ?? 'memory'

  if (mode === 'cloudflare') {
    if (!env.CF_API_TOKEN || !env.CF_ZONE_ID || !env.CF_SAAS_CNAME_TARGET) {
      throw new Error(
        'Cloudflare domain provider requires CF_API_TOKEN, CF_ZONE_ID, and CF_SAAS_CNAME_TARGET',
      )
    }

    return createDomainClient({
      provider: cloudflareSaaS({
        apiToken: env.CF_API_TOKEN,
        zoneId: env.CF_ZONE_ID,
        cnameTarget: env.CF_SAAS_CNAME_TARGET,
        customOriginServer: env.CF_SAAS_CUSTOM_ORIGIN,
      }),
    })
  }

  return createDomainClient({
    provider: memoryProvider({ initialStatus: 'pending_verification' }),
  })
}

export type { DnsRecord, Domain } from '@opencoredev/domain-sdk'
export { createDomainClient, memoryProvider, cloudflareSaaS }
