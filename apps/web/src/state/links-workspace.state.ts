import { observable } from '@legendapp/state'
import type { LinkFolder, ShortLink } from '#/data/demo/types'

/**
 * Demo link + folder edits, keyed by org id. Module-level so every
 * OrganizationProvider (dashboard, /create/link, …) sees the same data during
 * a session. Not persisted: a reload resets to the demo fixtures.
 * An org with no entry falls back to the demo fixtures.
 */
export type LinksWorkspaceState = {
  linksByOrg: Record<string, ShortLink[]>
  foldersByOrg: Record<string, LinkFolder[]>
}

export const linksWorkspace$ = observable<LinksWorkspaceState>({
  linksByOrg: {},
  foldersByOrg: {},
})
