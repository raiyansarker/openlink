import type { Organization } from '#/data/demo/types'

/** Why the workspace you were in is no longer at its URL. */
export type Departure =
  | { kind: 'renamed'; from: Organization; to: Organization }
  | { kind: 'lost'; from: Organization }

export class WorkspaceDeparture {
  /**
   * The workspace you were in, against your current list: still there under a
   * new slug means it was renamed; gone means you were removed (or it was deleted).
   */
  static of(previous: Organization, organizations: readonly Organization[]): Departure {
    const same = organizations.find((org) => org.id === previous.id)
    return same ? { kind: 'renamed', from: previous, to: same } : { kind: 'lost', from: previous }
  }
}
