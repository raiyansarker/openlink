import { Effect } from 'effect'

import { requireDomain } from '#/server/domain/guards'
import { notFound } from '#/server/orpc/errors'

import { getLinkInDomain } from './service'

/** The link, if it is on that domain of the workspace; otherwise a 404. */
export const requireLink = (organizationId: string, domainId: string, linkId: string) =>
  Effect.gen(function* () {
    yield* requireDomain(organizationId, domainId)
    const row = yield* getLinkInDomain(domainId, linkId)
    if (!row || row.organizationId !== organizationId) {
      return yield* Effect.fail(notFound('Link not found'))
    }
    return row
  })
