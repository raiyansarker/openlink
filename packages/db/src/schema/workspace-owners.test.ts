import { Database } from 'bun:sqlite'
import { afterEach, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const initialSchema = readFileSync(
  new URL('../../drizzle/0000_panoramic_patch.sql', import.meta.url),
  'utf8',
)
const migrateOwners = readFileSync(
  new URL('../../drizzle/0001_workspace_owners.sql', import.meta.url),
  'utf8',
)

let db: Database

afterEach(() => db?.close())

function setup() {
  db = new Database(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  db.exec(initialSchema)
  for (const id of ['org-1', 'org-2']) {
    db.run('INSERT INTO organization VALUES (?, ?, ?, 0, 0)', [id, id, id])
  }
}

function member(id: string, orgId: string, role: string, joinedAt: number) {
  db.run('INSERT INTO user VALUES (?, ?, ?, 0, NULL, 0, 0)', [
    id,
    id,
    `${id}@example.com`,
  ])
  db.run('INSERT INTO organization_member VALUES (?, ?, ?, ?, ?)', [
    id,
    orgId,
    id,
    role,
    joinedAt,
  ])
}

function roles() {
  return db.query('SELECT id, role FROM organization_member ORDER BY id').all()
}

describe('workspace owner migration', () => {
  test('promotes the earliest admin in each workspace, with a stable tie-breaker', () => {
    setup()
    member('a', 'org-1', 'member', 0)
    member('b', 'org-1', 'admin', 10)
    member('c', 'org-1', 'admin', 10)
    member('d', 'org-1', 'admin', 20)
    member('e', 'org-2', 'admin', 30)
    db.exec(migrateOwners)
    expect(roles()).toEqual([
      { id: 'a', role: 'member' },
      { id: 'b', role: 'owner' },
      { id: 'c', role: 'admin' },
      { id: 'd', role: 'admin' },
      { id: 'e', role: 'owner' },
    ])
    expect(db.query('PRAGMA foreign_key_check').all()).toEqual([])
  })

  test('preserves existing owners and can be safely rerun', () => {
    setup()
    member('a', 'org-1', 'owner', 20)
    member('b', 'org-1', 'admin', 10)
    member('c', 'org-2', 'admin', 10)
    db.exec(migrateOwners)
    const firstRun = roles()
    db.exec(migrateOwners)
    expect(roles()).toEqual(firstRun)
    expect(firstRun).toEqual([
      { id: 'a', role: 'owner' },
      { id: 'b', role: 'admin' },
      { id: 'c', role: 'owner' },
    ])
  })

  test('does not grant ownership to a member or viewer when no admin exists', () => {
    setup()
    member('a', 'org-1', 'member', 10)
    member('b', 'org-1', 'viewer', 20)
    db.exec(migrateOwners)
    expect(roles()).toEqual([
      { id: 'a', role: 'member' },
      { id: 'b', role: 'viewer' },
    ])
  })
})
