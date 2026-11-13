export type ColorMode = 'system' | 'light' | 'dark'

/** Legend State persisted store key */
export const APPEARANCE_STATE_STORAGE_KEY = 'openlink.appearance'

/** Pre–Legend State flat value (migrated on load) */
export const COLOR_MODE_STORAGE_KEY = 'openlink.color-mode'

export const DEFAULT_COLOR_MODE: ColorMode = 'system'

const ALLOWED: readonly ColorMode[] = ['system', 'light', 'dark']

function isColorMode(value: unknown): value is ColorMode {
  return typeof value === 'string' && ALLOWED.includes(value as ColorMode)
}

export function readLegacyColorMode(): ColorMode | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY)
    if (isColorMode(raw)) return raw
  } catch {
    /* ignore */
  }
  return null
}

/** Initial SSR/client render before Legend hydrate */
export function loadColorMode(): ColorMode {
  if (typeof window === 'undefined') return DEFAULT_COLOR_MODE
  try {
    const persisted = window.localStorage.getItem(APPEARANCE_STATE_STORAGE_KEY)
    if (persisted) {
      const parsed = JSON.parse(persisted) as { colorMode?: unknown }
      if (isColorMode(parsed?.colorMode)) return parsed.colorMode
    }
  } catch {
    /* ignore */
  }
  return readLegacyColorMode() ?? DEFAULT_COLOR_MODE
}
