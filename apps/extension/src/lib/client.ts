import { createORPCClient } from '@orpc/client'
import type { ContractRouterClient } from '@orpc/contract'
import { OpenAPILink } from '@orpc/openapi/fetch'
import { contract } from '@openlink/contracts'

export type OpenLinkClient = ContractRouterClient<typeof contract>

/**
 * Runs the request in the background service worker, which reads the app's
 * session cookie from the extension's cookie store and sends it with the
 * request. Every surface uses the same path — the popup, the options page and
 * the overlay framed inside other sites — so authentication behaves the same
 * everywhere.
 */
async function fetchViaBackground(url: string, init: RequestInit): Promise<Response> {
  const headers = init.headers instanceof Headers ? Object.fromEntries(init.headers.entries()) : ((init.headers ?? {}) as Record<string, string>)
  const answer = (await chrome.runtime.sendMessage({
    type: 'openlink-fetch',
    url,
    method: init.method ?? 'GET',
    headers,
    ...(init.body != null ? { body: typeof init.body === 'string' ? init.body : String(init.body) } : {}),
  })) as { status: number; statusText?: string; headers?: string[][]; body: string; error?: string }
  if (typeof answer?.status !== 'number') throw new Error('The extension process did not answer.')
  // Zero means the request never went out (offline, bad origin).
  if (answer.status === 0) throw new Error(answer.error || 'The request failed.')
  return new Response(answer.body, { status: answer.status, statusText: answer.statusText, headers: new Headers((answer.headers ?? []) as [string, string][]) })
}

/** Typed client for the OpenLink API over the user's sign-in session (Better Auth). */
export function createClient(origin: string): OpenLinkClient {
  const link = new OpenAPILink(contract, {
    origin: () => origin,
    url: '/api/v1',
    fetch: (url: string, init: RequestInit) => fetchViaBackground(url, init),
  })
  return createORPCClient(link) as OpenLinkClient
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function isUnauthorized(error: unknown): boolean {
  const e = error as { code?: string; status?: number } | null
  return e?.code === 'UNAUTHORIZED' || e?.status === 401
}
