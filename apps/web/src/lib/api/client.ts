import { createORPCClient } from '@orpc/client'
import type { ContractRouterClient } from '@orpc/contract'
import { OpenAPILink } from '@orpc/openapi/fetch'
import { contract } from '@openlink/contracts'

export type OpenLinkClient = ContractRouterClient<typeof contract>

type ApiClientOptions = {
  /** Origin of the API, e.g. `https://app.example.com`. */
  origin: () => string
  /** API root path; matches the Worker's OpenAPI mount. */
  basePath?: `/${string}`
  fetch?: (url: string, init: RequestInit) => Promise<Response>
}

/** Typed HTTP client for the OpenLink API, derived from the shared contract. */
export class ApiClient {
  static readonly BASE_PATH = '/api/v1' as const

  private static shared: OpenLinkClient | undefined

  static create(options: ApiClientOptions): OpenLinkClient {
    const link = new OpenAPILink(contract, {
      origin: options.origin,
      url: options.basePath ?? ApiClient.BASE_PATH,
      // Session cookies are same-origin, so the default credentials mode sends them.
      ...(options.fetch ? { fetch: (url: string, init: RequestInit) => options.fetch!(url, init) } : {}),
    })
    return createORPCClient(link) as OpenLinkClient
  }

  /** The browser's client; talks to the API on the page's own origin. */
  static get instance(): OpenLinkClient {
    ApiClient.shared ??= ApiClient.create({
      origin: () => (typeof window === 'undefined' ? 'http://localhost' : window.location.origin),
    })
    return ApiClient.shared
  }
}
