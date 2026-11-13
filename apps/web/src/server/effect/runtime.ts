import { ManagedRuntime } from 'effect'

import { AppLayer } from './layer'

/** Module-scoped runtime (Workers): sync scheduler + shared services. */
export const effectRuntime = ManagedRuntime.make(AppLayer)

/** Services shared by every request, as an Effect. */
export const requestEffectContext = effectRuntime.contextEffect
