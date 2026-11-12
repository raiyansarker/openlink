export type ColorMode = 'system' | 'light' | 'dark'

export const COLOR_MODE_STORAGE_KEY = 'openlink.color-mode'

const DEFAULT_COLOR_MODE: ColorMode = 'system'

function readStorage(key: string, allowed: readonly ColorMode[], fallback: ColorMode): ColorMode {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (raw && allowed.includes(raw as ColorMode)) return raw as ColorMode
  } catch {
    /* ignore */
  }
  return fallback
}

export function loadColorMode(): ColorMode {
  return readStorage(COLOR_MODE_STORAGE_KEY, ['system', 'light', 'dark'], DEFAULT_COLOR_MODE)
}

export function saveColorMode(mode: ColorMode) {
  try {
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode)
  } catch {
    /* ignore */
  }
}
