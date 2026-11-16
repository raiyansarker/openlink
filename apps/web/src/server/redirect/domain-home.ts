import { Effect } from 'effect'

import { findActiveDomainByHost, normalizeHost } from './resolve'
import { LinkMissingView, VanityDomainView } from './response'

/**
 * The root URL (`/`) of a host. The app's own host renders the app (`null`).
 * An active custom domain gets its vanity page; any other host (a pending or
 * unknown domain) gets the plain 404, with no way into the app.
 */
export class DomainHome {
  static respond(input: { host: string; appOrigin: string | null }) {
    return Effect.gen(function* () {
      const appHost = input.appOrigin && URL.canParse(input.appOrigin) ? new URL(input.appOrigin).host : null
      if (appHost && normalizeHost(input.host) === normalizeHost(appHost)) return null
      const domain = yield* findActiveDomainByHost(input.host)
      return domain ? VanityDomainView.render(domain.hostname, input.appOrigin) : LinkMissingView.notFound(null)
    })
  }
}
