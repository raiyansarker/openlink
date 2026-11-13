import {
  DEMO_SHORT_LINK_SCHEME,
  DEMO_SHORT_LINK_SUFFIX,
} from './constants'
import { getBaseUrl } from '#/lib/url/base-url'
import { demoCustomDomains } from './domains'
import type { Organization } from './types'

/** Default short host for an org, e.g. `github.olink`. */
export function defaultShortHost(org: Organization): string {
  return `${org.slug}.${DEMO_SHORT_LINK_SUFFIX}`
}

/** Hostname for a link: its custom domain, or the org default. */
export function shortHostFor(
  org: Organization,
  domainId?: string | null,
): string {
  const domain = domainId
    ? demoCustomDomains.find((d) => d.id === domainId)
    : undefined
  return domain?.hostname ?? defaultShortHost(org)
}

export function shortUrlFor(
  slug: string,
  org: Organization,
  domainId?: string | null,
): string {
  // Prefer the current runtime origin so copied links match the host the app is served from.
  // If a custom domain is selected, use it; otherwise fall back to the current host.
  const host = shortHostFor(org, domainId)
  const base = getBaseUrl({ allowRelative: true })

  // If we have a base (client), preserve its scheme; otherwise use the demo scheme.
  const scheme = base ? new URL(base).protocol.replace(/:$/, '') : DEMO_SHORT_LINK_SCHEME

  // If no custom domain, use current host when possible.
  const finalHost = domainId ? host : base ? new URL(base).host : host

  return `${scheme}://${finalHost}/${slug}`
}
