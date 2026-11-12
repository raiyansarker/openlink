import { useEffect, useState } from 'react'
import { useAppearancePreference } from '#/contexts/AppearancePreferenceContext'

export type ResolvedColorScheme = 'light' | 'dark'

function systemScheme(): ResolvedColorScheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

/** The colour scheme actually on screen, following "system" when chosen. */
export function useResolvedColorScheme(): ResolvedColorScheme {
  const { colorMode } = useAppearancePreference()
  const [system, setSystem] = useState<ResolvedColorScheme>(systemScheme)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystem(media.matches ? 'dark' : 'light')
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return colorMode === 'system' ? system : colorMode
}
