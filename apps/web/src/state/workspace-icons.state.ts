import { observable } from '@legendapp/state'

/**
 * Workspace icons chosen in this browser session, keyed by organization id.
 * The backend does not store icons yet, so they are not persisted.
 */
export const workspaceIcons$ = observable<Record<string, string>>({})
