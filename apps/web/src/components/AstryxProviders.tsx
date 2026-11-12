import { Theme } from '@astryxdesign/core/theme'
import type { ReactNode } from 'react'
import { defaultThemeSlug, themes } from '#/astryx-themes'
import { AppearancePreferenceProvider, useAppearancePreference } from '#/contexts/AppearancePreferenceContext'

function ThemedSubtree({ children }: { children: ReactNode }) {
  const { colorMode } = useAppearancePreference()
  return (
    <Theme theme={themes[defaultThemeSlug]} mode={colorMode}>
      {children}
    </Theme>
  )
}

export default function AstryxProviders({ children }: { children: ReactNode }) {
  return (
    <AppearancePreferenceProvider>
      <ThemedSubtree>{children}</ThemedSubtree>
    </AppearancePreferenceProvider>
  )
}
