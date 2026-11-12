import { Layer, Scheduler } from 'effect'

import type { OpenLinkDb } from '@openlink/db'

import { DbLive } from './services/db'

const SyncScheduler = Layer.succeed(
  Scheduler.Scheduler,
  new Scheduler.MixedScheduler('sync'),
)

export const AppLayer = Layer.empty.pipe(
  Layer.provideMerge(SyncScheduler),
  Layer.provideMerge(DbLive),
)

/** Services provided by the module-scoped runtime (per-request services are added in ApiContext). */
export type AppServices = OpenLinkDb
