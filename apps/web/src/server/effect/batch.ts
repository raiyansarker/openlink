import type { BatchItem } from 'drizzle-orm/batch'
import { Effect } from 'effect'

import { operation } from './operations'
import { Db } from './services/db'

/** A statement that can join a batch: an insert, update, delete or select builder, not yet run. */
export type Statement = BatchItem<'sqlite'>

/**
 * Run several writes as one D1 batch. D1 runs a batch as a single transaction:
 * every statement is applied, or none is. D1 has no interactive transactions, so
 * statements cannot read each other's results; generate ids in code before building them.
 *
 * Resolves to each statement's result, in order (rows for statements with `.returning()`).
 * An empty list runs nothing.
 */
export const writeBatch = (name: string, statements: readonly Statement[]) =>
  Effect.gen(function* () {
    if (statements.length === 0) return [] as unknown[]
    const db = yield* Db
    return yield* operation(name, () => db.batch(statements as [Statement, ...Statement[]]) as Promise<unknown[]>)
  })
