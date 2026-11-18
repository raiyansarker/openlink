import { Effect } from 'effect'

import { getDomainInOrganization } from '#/server/api/access'
import { notFound } from '#/server/orpc/errors'

/** The domain, if it belongs to the workspace; otherwise a 404. */
export const requireDomain = (organizationId: string, domainId: string) =>
  Effect.gen(function* () {
    const domain = yield* getDomainInOrganization(domainId, organizationId)
    if (!domain) return yield* Effect.fail(notFound('Domain not found'))
    return domain
  })
