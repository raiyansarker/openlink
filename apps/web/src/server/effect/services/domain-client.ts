import { Context, Effect } from 'effect'
import type { createOpenLinkDomainClient } from '@openlink/domain'
import type { BackendError } from '../operations'

type DomainClientInstance = ReturnType<typeof createOpenLinkDomainClient>

/** Lazy accessor, for the same reason as `Auth`. */
export class DomainClient extends Context.Service<
  DomainClient,
  Effect.Effect<DomainClientInstance, BackendError>
>()('openlink/DomainClient') {}

/** Resolve the provider client; fails with a typed BackendError only when used. */
export const useDomainClient = Effect.gen(function* () {
  const resolve = yield* DomainClient
  return yield* resolve
})
