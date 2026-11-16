import { getBaseUrl } from '#/lib/url/base-url'

type DomainLike = { id: string; hostname: string }

/**
 * Where short links live. A link without a domain is served by the app's own
 * host (whatever origin this page runs on, e.g. `localhost:3000`); a link with
 * a domain is served by that custom domain over HTTPS.
 */
export class ShortUrl {
  /** The app's own origin, e.g. `http://localhost:3000`. Empty during SSR without a configured base URL. */
  static appOrigin(): string {
    return getBaseUrl({ allowRelative: true })
  }

  /** The app's own host, e.g. `localhost:3000`. */
  static appHost(): string {
    const origin = ShortUrl.appOrigin()
    return origin ? new URL(origin).host : ''
  }

  static host(domainId: string | null | undefined, domains: readonly DomainLike[]): string {
    const domain = domainId ? domains.find((d) => d.id === domainId) : undefined
    return domain?.hostname ?? ShortUrl.appHost()
  }

  static build(slug: string, domainId: string | null | undefined, domains: readonly DomainLike[]): string {
    const domain = domainId ? domains.find((d) => d.id === domainId) : undefined
    if (domain) return `https://${domain.hostname}/${slug}`
    return `${ShortUrl.appOrigin()}/${slug}`
  }
}
