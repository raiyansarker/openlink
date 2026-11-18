import type { Workspace } from '#/lib/api/types'

/** Why the workspace you were in is no longer at its URL. */
export type Departure =
  | { kind: 'renamed'; from: Workspace; to: Workspace }
  | { kind: 'lost'; from: Workspace }

export class WorkspaceDeparture {
  /**
   * The workspace you were in, against your current list: still there under a
   * new slug means it was renamed; gone means you were removed (or it was deleted).
   */
  static of(previous: Workspace, organizations: readonly Workspace[]): Departure {
    const same = organizations.find((org) => org.id === previous.id)
    return same ? { kind: 'renamed', from: previous, to: same } : { kind: 'lost', from: previous }
  }
}
