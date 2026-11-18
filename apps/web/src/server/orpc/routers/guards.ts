import { Effect } from 'effect'

import { getDomainInOrganization } from '#/server/api/access'
import { getLinkInDomain } from '#/server/links/service'

import { notFound } from '../errors'

/** Lookups and error types shared by more than one router. */
export const requireDomain = (organizationId: string, domainId: string) =>
  Effect.gen(function* () {
    const domain = yield* getDomainInOrganization(domainId, organizationId)
    if (!domain) return yield* Effect.fail(notFound('Domain not found'))
    return domain
  })

export const requireLink = (organizationId: string, domainId: string, linkId: string) =>
  Effect.gen(function* () {
    yield* requireDomain(organizationId, domainId)
    const row = yield* getLinkInDomain(domainId, linkId)
    if (!row || row.organizationId !== organizationId) {
      return yield* Effect.fail(notFound('Link not found'))
    }
    return row
  })

export type MessageError = (options: { message: string }) => Error
export type ErrorFactories = { NOT_FOUND: MessageError; FORBIDDEN: MessageError }
