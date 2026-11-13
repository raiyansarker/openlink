import { Layer, Scheduler } from 'effect'

import { AuthLive, type Auth } from './services/auth'
import { BindingsLive, type Bindings } from './services/bindings'
import { DbLive, type Db } from './services/db'
import { DomainClientLive, type DomainClient } from './services/domain-client'

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
