import { observable, observe } from '@legendapp/state'
import { syncObservable } from '@legendapp/state/sync'
import { ObservablePersistLocalStorage } from '@legendapp/state/persist-plugins/local-storage'
import {
  APPEARANCE_STATE_STORAGE_KEY,
  DEFAULT_COLOR_MODE,
  loadColorMode,
  readLegacyColorMode,
  type ColorMode,
} from '#/lib/settings/appearance-preference'

export type AppearanceState = {
  colorMode: ColorMode
}

export const appearance$ = observable<AppearanceState>({
  colorMode: loadColorMode() ?? DEFAULT_COLOR_MODE,
})

let appearanceStateInitialized = false

function applyDocumentColorMode(mode: ColorMode) {
  if (typeof document === 'undefined') return
  if (mode === 'light' || mode === 'dark') {
    document.documentElement.setAttribute('data-theme', mode)
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

export function initAppearanceState() {
  if (appearanceStateInitialized || typeof window === 'undefined') return
  appearanceStateInitialized = true

  const legacy = readLegacyColorMode()
  if (legacy) {
    appearance$.colorMode.set(legacy)
  }

  syncObservable(appearance$, {
    persist: {
      name: APPEARANCE_STATE_STORAGE_KEY,
      plugin: ObservablePersistLocalStorage,
    },
  })

  applyDocumentColorMode(appearance$.colorMode.peek())

  observe(appearance$.colorMode, ({ value }) => {
    if (value) applyDocumentColorMode(value)
  })

  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const onSystemSchemeChange = () => {
    if (appearance$.colorMode.peek() === 'system') {
      applyDocumentColorMode('system')
    }
  }
  media.addEventListener('change', onSystemSchemeChange)
}

if (typeof window !== 'undefined') {
  initAppearanceState()
}
