import { afterEach, describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const databases: Database[] = []
afterEach(() => {
  for (const database of databases.splice(0)) database.close()
})

const dir = join(import.meta.dir, '../../../../../packages/db/drizzle')
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
const apply = (db: Database, file: string) => {
  for (const statement of readFileSync(join(dir, file), 'utf8').split('--> statement-breakpoint')) {
    if (statement.trim()) db.exec(statement)
  }
}

describe('migration 0009 (links may use the app host)', () => {
  // `PRAGMA foreign_keys=OFF` inside the file is ignored here, as it is on D1.
  function migratedWithData(enforce: boolean) {
    const db = new Database(':memory:')
    databases.push(db)
    db.exec(`PRAGMA foreign_keys = ${enforce ? 'ON' : 'OFF'}`)
    for (const file of files.filter((f) => f < '0009')) apply(db, file)
    db.exec(`
      INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES ('u1', 'Ada', 'a@e.test', 1, 0, 0);
      INSERT INTO organization (id, name, slug, created_at, updated_at) VALUES ('o1', 'Acme', 'acme', 0, 0);
      INSERT INTO custom_domain (id, organization_id, hostname, readiness, provider, created_at, updated_at) VALUES ('d1', 'o1', 'go.acme.test', 'active', 'memory', 0, 0);
      INSERT INTO link (id, organization_id, domain_id, slug, destination_url, created_at, updated_at) VALUES ('l1', 'o1', 'd1', 'hello', 'https://e.test', 0, 0);
      INSERT INTO link_comment (id, organization_id, link_id, author_label, body, created_at) VALUES ('c1', 'o1', 'l1', 'Ada', 'keep me', 0), ('c2', 'o1', 'l1', 'Ada', 'me too', 0);
    `)
    if (enforce) {
      // Emulate D1: the file's PRAGMA foreign_keys=OFF must have no effect.
      const original = db.exec.bind(db)
      db.exec = ((sql: string) => original(sql.replace(/PRAGMA foreign_keys=OFF;?/gi, 'SELECT 1;'))) as typeof db.exec
    }
    // Only 0009 itself: later migrations (e.g. 0013 drops comments) are not what this checks.
    for (const file of files.filter((f) => f.startsWith('0009'))) apply(db, file)
    return db
  }

  for (const enforce of [true, false]) {
    test(`keeps links and comments (foreign keys ${enforce ? 'enforced, like D1' : 'off'})`, () => {
      const db = migratedWithData(enforce)
      expect(db.query('SELECT id, domain_id FROM link').all()).toEqual([{ id: 'l1', domain_id: 'd1' }])
      expect(db.query('SELECT id, body FROM link_comment ORDER BY id').all()).toEqual([
        { id: 'c1', body: 'keep me' },
        { id: 'c2', body: 'me too' },
      ])
      expect(db.query("SELECT name FROM sqlite_master WHERE name = '__link_comment_backup'").all()).toEqual([])
    })
  }

  test('app-host links are allowed, and their slugs are unique across workspaces', () => {
    const db = migratedWithData(true)
    db.exec("INSERT INTO organization (id, name, slug, created_at, updated_at) VALUES ('o2', 'Other', 'other', 0, 0)")
    db.exec("INSERT INTO link (id, organization_id, domain_id, slug, destination_url, created_at, updated_at) VALUES ('l2', 'o1', NULL, 'launch', 'https://e.test', 0, 0)")
    expect(() =>
      db.exec("INSERT INTO link (id, organization_id, domain_id, slug, destination_url, created_at, updated_at) VALUES ('l3', 'o2', NULL, 'launch', 'https://e.test', 0, 0)"),
    ).toThrow(/UNIQUE/)
    // The same slug on a custom domain is a different link.
    db.exec("INSERT INTO link (id, organization_id, domain_id, slug, destination_url, created_at, updated_at) VALUES ('l4', 'o1', 'd1', 'launch', 'https://e.test', 0, 0)")
    expect(db.query('SELECT count(*) AS n FROM link').get()).toEqual({ n: 3 })
  })
})
