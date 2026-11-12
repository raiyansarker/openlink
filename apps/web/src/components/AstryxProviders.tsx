import { Theme } from '@astryxdesign/core/theme'
import { use$ } from '@legendapp/state/react'
import type { ReactNode } from 'react'
import { defaultThemeSlug, themes } from '#/astryx-themes'
import { WorkspaceDirectoryProvider } from '#/contexts/WorkspaceDirectoryContext'
import { appearance$ } from '#/state/appearance.state'

function ThemedSubtree({ children }: { children: ReactNode }) {
  const colorMode = use$(appearance$.colorMode)
  return (
    <Theme theme={themes[defaultThemeSlug]} mode={colorMode}>
      {children}
    </Theme>
  )
}

export default function AstryxProviders({ children }: { children: ReactNode }) {
  return (
    <WorkspaceDirectoryProvider>
      <ThemedSubtree>{children}</ThemedSubtree>
    </WorkspaceDirectoryProvider>
  )
}
