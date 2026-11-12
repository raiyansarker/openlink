import { createDb, type OpenLinkDb } from '@openlink/db'
import { getBindings } from './env'

let db: OpenLinkDb | undefined

export function getDb() {
  db ??= createDb(getBindings().DB)
  return db
}
