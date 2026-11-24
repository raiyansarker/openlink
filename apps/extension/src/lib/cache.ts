import type { ConnectedWorkspace } from './settings'
import type { Domain, RecentLink } from '../components/LinkApp'
import type { Folder } from '../components/FolderPicker'

/**
 * The last data shown for one workspace, so the panel paints instantly and
 * refreshes quietly in the background. One cache: the app keeps a single
 * connection, so a single workspace's context is enough.
 */
export type LinkCache = {
  origin: string
  organizationId: string
  workspaces: ConnectedWorkspace[]
  domains: Domain[]
  folders: Folder[]
  recent: RecentLink[]
  savedAt: number
}

const KEY = 'cache'

export async function loadCache(): Promise<LinkCache | undefined> {
  return (await chrome.storage.local.get(KEY))[KEY] as LinkCache | undefined
}

export async function saveCache(cache: LinkCache): Promise<void> {
  try {
    await chrome.storage.local.set({ [KEY]: cache })
  } catch {
    // A failed cache write never blocks the panel.
  }
}

/** Drops the cached state, e.g. when the server says the session is gone,
 * so a signed-out user never glimpses the previous session's data. */
export async function clearCache(): Promise<void> {
  try {
    await chrome.storage.local.remove(KEY)
  } catch {
    // Best effort only.
  }
}
