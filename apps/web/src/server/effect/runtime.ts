import { Layer, ManagedRuntime, Scheduler } from 'effect'

/** Effect on Cloudflare Workers: sync scheduler + module-scoped runtime. */
const SyncScheduler = Layer.succeed(
  Scheduler.Scheduler,
  new Scheduler.MixedScheduler('sync'),
)

const AppLayer = Layer.empty.pipe(Layer.provideMerge(SyncScheduler))

export const effectRuntime = ManagedRuntime.make(AppLayer)

export async function getRequestEffectContext() {
  return effectRuntime.context()
}
