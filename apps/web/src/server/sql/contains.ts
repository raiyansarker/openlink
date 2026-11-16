import { sql, type SQL, type SQLWrapper } from 'drizzle-orm'

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`)

/** `column` contains `value`, case-insensitively (SQLite LIKE), with `%` and `_` taken literally. */
export const contains = (column: SQLWrapper, value: string): SQL =>
  sql`${column} LIKE ${`%${escapeLike(value)}%`} ESCAPE '\\'`
