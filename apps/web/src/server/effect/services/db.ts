import type { OpenLinkDb } from '@openlink/db'
import { Context } from 'effect'

export class Db extends Context.Service<Db, OpenLinkDb>()('openlink/Db') {}
