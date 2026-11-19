import { Layer, Scheduler } from 'effect'
import { createOpenLinkDomainClient } from '@openlink/domain'
import { getAuth } from '#/server/auth/instance'
import { getDb } from '#/server/db'
import { getBindings } from '#/server/env'
import { EffectLogger } from '#/server/observability/effect-logger'
import { CloudflareTracer } from '#/server/observability/cloudflare-tracer'
import { EmailDispatch, EmailDispatchLive } from '#/server/email/dispatch'
import { operation } from './operations'
import { Auth } from './services/auth'
import { Bindings } from './services/bindings'
import { Db } from './services/db'
import { DomainClient } from './services/domain-client'

// Bindings and Db are required for any request, so they are built eagerly.
// Auth and the domain client are constructed from configuration that can be
// invalid; they stay lazy so a bad secret surfaces as a typed failure (and a
// failing /health entry) instead of preventing the whole runtime from starting.
const DbLive = Layer.sync(Db, getDb)
const BindingsLive = Layer.sync(Bindings, getBindings)
const AuthLive = Layer.succeed(Auth, operation('auth.initialize', getAuth))
const DomainClientLive = Layer.succeed(
  DomainClient,
  operation('domain.initializeClient', () => createOpenLinkDomainClient(getBindings())),
)

const SyncScheduler = Layer.succeed(
  Scheduler.Scheduler,
  new Scheduler.MixedScheduler('sync'),
)

export const AppLayer = Layer.mergeAll(
  SyncScheduler,
  // JSON logs for Workers Logs, and Effect spans as Workers trace spans.
  EffectLogger.layer,
  CloudflareTracer.layer,
  DbLive,
  BindingsLive,
  AuthLive,
  DomainClientLive,
  EmailDispatchLive.pipe(Layer.provide(Layer.mergeAll(BindingsLive, DbLive))),
)

/** Services provided by the module-scoped runtime (per-request services are added in ApiContext). */
export type AppServices = Db | Auth | Bindings | DomainClient | EmailDispatch
