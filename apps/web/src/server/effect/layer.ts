import { Effect, Layer, Scheduler } from 'effect'
import { createOpenLinkDomainClient } from '@openlink/domain'
import { getAuth } from '#/server/auth/instance'
import { getDb } from '#/server/db'
import { getBindings } from '#/server/env'
import { Auth } from './services/auth'
import { Bindings } from './services/bindings'
import { Db } from './services/db'
import { DomainClient } from './services/domain-client'

const DbLive = Layer.sync(Db, getDb)
const AuthLive = Layer.sync(Auth, getAuth)
const BindingsLive = Layer.sync(Bindings, getBindings)
const DomainClientLive = Layer.effect(DomainClient, Effect.gen(function* () {
  const bindings = yield* Bindings
  return createOpenLinkDomainClient(bindings)
}))

const SyncScheduler = Layer.succeed(
  Scheduler.Scheduler,
  new Scheduler.MixedScheduler('sync'),
)

export const AppLayer = Layer.mergeAll(
  SyncScheduler,
  DbLive,
  AuthLive,
  DomainClientLive.pipe(Layer.provideMerge(BindingsLive)),
)

/** Services provided by the module-scoped runtime (per-request services are added in ApiContext). */
export type AppServices = Db | Auth | Bindings | DomainClient
