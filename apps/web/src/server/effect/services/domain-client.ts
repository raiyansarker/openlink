import { Context, Effect, Layer } from 'effect'
import { createOpenLinkDomainClient } from '@openlink/domain'
import { Bindings } from './bindings'

export class DomainClient extends Context.Service<
  DomainClient,
  ReturnType<typeof createOpenLinkDomainClient>
>()('openlink/DomainClient') {}

export const DomainClientLive = Layer.effect(
  DomainClient,
  Effect.gen(function* () {
    const bindings = yield* Bindings
    return createOpenLinkDomainClient(bindings)
  }),
)
