import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { loadColorMode, saveColorMode, type ColorMode } from '#/lib/settings/appearance-preference'

type AppearancePreferenceContextValue = {
  colorMode: ColorMode
  setColorMode: (mode: ColorMode) => void
}

const AppearancePreferenceContext = createContext<AppearancePreferenceContextValue | null>(null)

export function AppearancePreferenceProvider({ children }: { children: ReactNode }) {
  const [colorMode, setColorModeState] = useState<ColorMode>(loadColorMode)

  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode)
    saveColorMode(mode)
  }, [])

  const value = useMemo(() => ({ colorMode, setColorMode }), [colorMode, setColorMode])

  return (
    <AppearancePreferenceContext.Provider value={value}>
      {children}
    </AppearancePreferenceContext.Provider>
  )
}

export function useAppearancePreference() {
  const ctx = useContext(AppearancePreferenceContext)
  if (!ctx) {
    throw new Error('useAppearancePreference must be used within AppearancePreferenceProvider')
  }
  return ctx
}
