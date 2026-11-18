import { Effect } from 'effect'

import { toDomainDto } from '#/server/api/serializers'
import { requireOrgAdminEffect, requireOrgMemberEffect } from '#/server/effect/access'
import { audit } from '#/server/activity/audit'
import { os } from '#/server/orpc/implement'

import {
  listDomainsForOrganization,
  registerCustomDomain,
  refreshCustomDomain,
  removeCustomDomain,
} from './service'
import { DomainLinks } from './domain-links'
import { requireDomain } from './guards'

export const domainsController = {
  listDomains: os.domains.listDomains.effect(function* ({ input }) {
    yield* requireOrgMemberEffect(input.params.organizationId)
    const rows = yield* listDomainsForOrganization(input.params.organizationId)
    const counts = yield* DomainLinks.counts(input.params.organizationId)
    return { items: rows.map((row) => toDomainDto(row, counts.get(row.id) ?? 0)) }
  }),

  addDomain: os.domains.addDomain.effect(function* ({ input, errors }) {
    const { session } = yield* requireOrgAdminEffect(input.params.organizationId)
    const row = yield* registerCustomDomain({
      organizationId: input.params.organizationId,
      hostname: input.body.hostname,
    }).pipe(Effect.catchTags({
      DomainTaken: () => Effect.fail(errors.CONFLICT({ message: 'That domain is already connected to a workspace' })),
      BackendError: () => Effect.fail(errors.BAD_REQUEST({ message: 'Unable to register domain' })),
    }))
    yield* audit(session, {
      organizationId: input.params.organizationId,
      action: 'domain.added',
      target: { type: 'domain', id: row.id, label: row.hostname },
    })
    return toDomainDto(row)
  }),

  getDomain: os.domains.getDomain.effect(function* ({ input }) {
    yield* requireOrgMemberEffect(input.params.organizationId)
    const row = yield* requireDomain(input.params.organizationId, input.params.domainId)
    return toDomainDto(row, yield* DomainLinks.countFor(input.params.organizationId, row.id))
  }),

  removeDomain: os.domains.removeDomain.effect(function* ({ input, errors }) {
    const { organizationId, domainId } = input.params
    const { session } = yield* requireOrgAdminEffect(organizationId)
    const domain = yield* requireDomain(organizationId, domainId)
    // Its links are deleted with it (the foreign key cascades); the log keeps how many.
    const linkCount = yield* DomainLinks.countFor(organizationId, domainId)
    const removed = yield* removeCustomDomain(domainId, organizationId)
    if (!removed) return yield* Effect.fail(errors.NOT_FOUND({ message: 'Domain not found' }))
    yield* audit(session, {
      organizationId,
      action: 'domain.removed',
      target: { type: 'domain', id: domainId, label: domain.hostname },
      ...(linkCount > 0 ? { changes: [{ label: 'Links deleted', from: String(linkCount), to: '0' }] } : {}),
    })
    return {}
  }),

  refreshDomainStatus: os.domains.refreshDomainStatus.effect(function* ({ input }) {
    yield* requireOrgAdminEffect(input.params.organizationId)
    const row = yield* requireDomain(input.params.organizationId, input.params.domainId)
    const updated = yield* refreshCustomDomain(input.params.domainId)
    return toDomainDto(updated ?? row, yield* DomainLinks.countFor(input.params.organizationId, row.id))
  }),
}
