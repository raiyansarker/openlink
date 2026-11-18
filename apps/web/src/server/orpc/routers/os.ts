import '@orpc/effect/extensions/effect'
import { contract } from '@openlink/contracts'
import { implement } from '@orpc/server'

import type { ApiContext } from '../context'

/** The contract implementer every procedure router builds on. */
export const os = implement(contract).$context<ApiContext>()
