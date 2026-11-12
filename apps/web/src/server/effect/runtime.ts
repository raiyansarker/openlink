import { ManagedRuntime } from 'effect'

import { AppLayer } from './layer'

/** Module-scoped runtime (Workers): sync scheduler + shared services. */
export const effectRuntime = ManagedRuntime.make(AppLayer)

export async function getRequestEffectContext() {
  return effectRuntime.context()
}
