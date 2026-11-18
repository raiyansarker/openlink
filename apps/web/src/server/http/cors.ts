/**
 * Open CORS for the public API (`/api/v1`). Any origin may call it.
 *
 * `Access-Control-Allow-Credentials` is deliberately never sent, so browsers will not attach
 * cookies to cross-origin calls. Cross-origin callers authenticate with `Authorization: Bearer <api key>`.
 */
export class Cors {
  private static readonly METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  private static readonly DEFAULT_HEADERS = 'authorization, content-type'
  private static readonly MAX_AGE_SECONDS = '86400'

  /** Answers a preflight request. */
  static preflight(request: Request): Response {
    const requested = request.headers.get('access-control-request-headers')
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': Cors.METHODS,
        'access-control-allow-headers': requested ?? Cors.DEFAULT_HEADERS,
        'access-control-max-age': Cors.MAX_AGE_SECONDS,
      },
    })
  }

  /** Returns a copy of `response` carrying the CORS headers (the original may have immutable headers). */
  static apply(response: Response): Response {
    const headers = new Headers(response.headers)
    headers.set('access-control-allow-origin', '*')
    headers.set('access-control-expose-headers', 'retry-after, x-request-id')
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }
}
