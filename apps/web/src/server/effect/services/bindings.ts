import { Context } from 'effect'
import type { WorkerBindings } from '#/server/env'

export class Bindings extends Context.Service<Bindings, WorkerBindings>()('openlink/Bindings') {}
