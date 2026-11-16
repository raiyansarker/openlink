import { observable } from '@legendapp/state'
import type { ShortLink } from '#/data/demo/types'

/** Parts of a link the API does not store yet (destination health checks). */
export type LinkLocalExtras = Pick<ShortLink, 'health'>

/**
 * Session-only link extras, keyed by link id. Module-level so every
 * OrganizationProvider (dashboard, /create/link, …) sees the same data during
 * a session. Not persisted: a reload clears them. Links and folders themselves
 * come from the API (see OrganizationContext).
 */
export type LinksWorkspaceState = {
  extrasByLink: Record<string, LinkLocalExtras>
}

export const linksWorkspace$ = observable<LinksWorkspaceState>({
  extrasByLink: {},
})
