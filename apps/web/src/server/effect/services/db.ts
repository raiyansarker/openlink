import type { OpenLinkDb } from '@openlink/db'
import { Context, Layer } from 'effect'

import { getDb } from '#/server/db'

export class Db extends Context.Service<Db, OpenLinkDb>()('openlink/Db') {}

export const DbLive = Layer.sync(Db, () => getDb())
