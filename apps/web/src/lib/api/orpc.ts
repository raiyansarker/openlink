import { createORPCClient } from '@orpc/client'
import type { ContractRouterClient } from '@orpc/contract'
import { OpenAPILink } from '@orpc/openapi/fetch'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import { contract } from '@openlink/contracts'

export type OpenLinkClient = ContractRouterClient<typeof contract>

/** API root path; matches the Worker's OpenAPI mount. */
export const API_BASE_PATH = '/api/v1'

type ApiClientOptions = {
  /** Origin of the API, e.g. `https://app.example.com`. */
  origin: () => string
  fetch?: (url: string, init: RequestInit) => Promise<Response>
}

/** A typed HTTP client for the OpenLink API, built from the shared contract. */
export function createApiClient(options: ApiClientOptions): OpenLinkClient {
  const link = new OpenAPILink(contract, {
    origin: options.origin,
    url: API_BASE_PATH,
    // Session cookies are same-origin, so the default credentials mode sends them.
    ...(options.fetch ? { fetch: (url: string, init: RequestInit) => options.fetch!(url, init) } : {}),
  })
  return createORPCClient(link) as OpenLinkClient
}

/** The browser's client; talks to the API on the page's own origin. */
export const api = createApiClient({
  origin: () => (typeof window === 'undefined' ? 'http://localhost' : window.location.origin),
})

/**
 * TanStack Query options and keys for every API procedure, e.g.
 * `useQuery(orpc.folders.listFolders.queryOptions({ input }))` and
 * `queryClient.invalidateQueries({ queryKey: orpc.folders.key() })`.
 */
export const orpc = createTanstackQueryUtils(api)
