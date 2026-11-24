/** One workspace the extension can act for, from the user's signed-in session. */
export type ConnectedWorkspace = {
  organizationId: string
  name: string
  slug: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
}

/** A workspace reached through one of the app's API keys, not the session. */
export type KeyWorkspace = ConnectedWorkspace & {
  /** The `sk_…` secret; sent as a bearer token. */
  apiKey: string
}

export type Settings = {
  /** Origin of the OpenLink app, e.g. `https://links.example.com`. */
  origin?: string
  /** Last workspace picked in the popup or overlay. */
  activeOrganizationId?: string
  /** The API-key mode, when connected with a key instead of the browser session. */
  apiKeyWorkspace?: KeyWorkspace
}

const KEY = 'settings'

export async function loadSettings(): Promise<Settings> {
  const stored = (await chrome.storage.local.get(KEY))[KEY] as Partial<Settings> | undefined
  return { ...stored }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [KEY]: settings })
}

export async function updateSettings(change: (current: Settings) => Settings): Promise<Settings> {
  const next = change(await loadSettings())
  await saveSettings(next)
  return next
}

/** Normalises user input to a bare origin, or returns null when it is not an http(s) URL. */
export function normalizeOrigin(input: string): string | null {
  try {
    const url = new URL(input.trim())
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.origin
  } catch {
    return null
  }
}

/** Match pattern covering one origin, for `chrome.permissions`. */
export function originPattern(origin: string): string {
  return `${origin}/*`
}
