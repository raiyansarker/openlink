import { Theme } from '@astryxdesign/core/theme'
import type { ReactNode } from 'react'
import { defaultThemeSlug, themes } from '#/astryx-themes'

export default function AstryxProviders({ children }: { children: ReactNode }) {
  return <Theme theme={themes[defaultThemeSlug]}>{children}</Theme>
}
