import { Context, Layer } from 'effect'
import { getBindings, type WorkerBindings } from '#/server/env'

export class Bindings extends Context.Service<Bindings, WorkerBindings>()('openlink/Bindings') {}

export const BindingsLive = Layer.sync(Bindings, getBindings)
