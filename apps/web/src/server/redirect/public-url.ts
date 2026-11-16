/**
 * The URL the visitor actually opened.
 *
 * In production Cloudflare delivers the visitor's own `Host` (custom hostnames keep it),
 * so the request URL is already right and forwarded headers are ignored: anyone can send
 * them, and trusting them would let one domain serve another domain's links.
 *
 * In local dev a reverse proxy (e.g. Roxy, for `https://go.example.roxy`) usually
 * rewrites `Host` to `127.0.0.1:3000` and passes the original in `X-Forwarded-Host` /
 * `X-Forwarded-Proto`. Without reading them every custom domain looks like the app host.
 */
export class PublicUrl {
  static of(request: Request, trustForwarded: boolean = import.meta.env.DEV): URL {
    const url = new URL(request.url)
    if (!trustForwarded) return url

    const host = PublicUrl.first(request.headers.get('x-forwarded-host'))
    if (!host) return url
    const proto = PublicUrl.first(request.headers.get('x-forwarded-proto'))

    const forwarded = new URL(url)
    if (proto === 'http' || proto === 'https') forwarded.protocol = `${proto}:`
    forwarded.host = host
    // A host without a port means the default one, not the proxy's upstream port.
    if (!host.includes(':')) forwarded.port = ''
    return forwarded
  }

  /** Proxies chain values as `a, b`; the first is what the visitor sent. */
  private static first(value: string | null) {
    return value?.split(',')[0]?.trim() || null
  }
}
