import { readBearerApiKey } from '#/server/apikeys/secret'
import { AuthOrigins } from '#/server/auth/origins'
import type { WorkerBindings } from '#/server/env'

/**
 * Browsers send form bodies (multipart, URL-encoded, plain text) cross-site without a CORS
 * preflight, so such a request made with the session cookie must come from the app itself.
 * JSON requests always get a preflight, and API-key requests carry no cookie, so both pass.
 */
export class FormOrigin {
  private static readonly FORM_TYPES = new Set(['multipart/form-data', 'application/x-www-form-urlencoded', 'text/plain'])
  private static readonly SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

  /** A state-changing form request sent without an API key: its Origin must be checked. */
  static needsCheck(request: Request): boolean {
    if (FormOrigin.SAFE_METHODS.has(request.method)) return false
    const contentType = request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase()
    if (!contentType || !FormOrigin.FORM_TYPES.has(contentType)) return false
    return !readBearerApiKey(request.headers.get('authorization'))
  }

  static isTrusted(request: Request, bindings: Pick<WorkerBindings, 'BETTER_AUTH_URL' | 'BETTER_AUTH_TRUSTED_ORIGINS'>): boolean {
    const origin = request.headers.get('origin')
    return Boolean(origin && AuthOrigins.trusted(bindings).includes(origin))
  }

  /** The same error shape oRPC sends for its own FORBIDDEN failures. */
  static response(): Response {
    return Response.json(
      { defined: false, code: 'FORBIDDEN', status: 403, message: 'This request was blocked.' },
      { status: 403, headers: { 'cache-control': 'no-store' } },
    )
  }
}
