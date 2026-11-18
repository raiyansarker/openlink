import { readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { defineConfig } from 'drizzle-kit'

/**
 * Drizzle Studio on the local D1 database (the one `wrangler dev` and `db:migrate:local` use).
 * Wrangler keeps it as a SQLite file with a hashed name; the most recently written one is opened.
 */
// drizzle-kit runs from packages/db (see the `studio` script) and loads this file as CommonJS,
// so the path is resolved from the working directory rather than `import.meta`.
const D1_DIR = resolve('../../apps/web/.wrangler/state/v3/d1/miniflare-D1DatabaseObject')

function localDatabaseFile(): string {
  let files: string[]
  try {
    files = readdirSync(D1_DIR).filter((file) => file.endsWith('.sqlite') && file !== 'metadata.sqlite')
  } catch {
    files = []
  }
  if (files.length === 0) {
    throw new Error(`No local D1 database in ${D1_DIR}. Run "bun run db:migrate:local" in apps/web first.`)
  }
  const newest = files
    .map((file) => ({ file, mtime: statSync(join(D1_DIR, file)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0]!
  return join(D1_DIR, newest.file)
}

export default defineConfig({
  schema: './src/schema/index.ts',
  dialect: 'sqlite',
  dbCredentials: { url: `file:${localDatabaseFile()}` },
})
