import { Database } from 'bun:sqlite'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { OpenLinkDb } from '@openlink/db'
import { drizzle } from 'drizzle-orm/bun-sqlite'

const MIGRATIONS_DIR = join(import.meta.dir, '../../../../../packages/db/drizzle')

const migrations = readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))

/**
 * In-memory SQLite with the real checked-in migrations applied, so tests
 * exercise the production schema instead of a hand-written copy.
 * Foreign keys are off unless requested; most fixtures seed partial graphs.
 */
export function createTestDatabase(options: { foreignKeys?: boolean } = {}) {
  const sqlite = new Database(':memory:')
  sqlite.exec(`PRAGMA foreign_keys = ${options.foreignKeys ? 'ON' : 'OFF'}`)
  for (const migration of migrations) {
    for (const statement of migration.split('--> statement-breakpoint')) {
      if (statement.trim()) sqlite.exec(statement)
    }
  }
  // Migrations may toggle foreign keys themselves; restore what the test asked for.
  sqlite.exec(`PRAGMA foreign_keys = ${options.foreignKeys ? 'ON' : 'OFF'}`)
  const adapter = drizzle(sqlite)
  // Both drizzle adapters expose the same SQLite query builders the services use.
  const db = adapter as unknown as OpenLinkDb
  return { sqlite, adapter, db }
}
