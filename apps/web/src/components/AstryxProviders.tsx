import { Theme } from '@astryxdesign/core/theme'
import { useSyncExternalStore, type ReactNode } from 'react'
import { defaultThemeSlug, themes } from '#/astryx-themes'
import { WorkspaceDirectoryProvider } from '#/contexts/WorkspaceDirectoryContext'
import { DEFAULT_COLOR_MODE, type ColorMode } from '#/lib/settings/appearance-preference'
import { appearance$ } from '#/state/appearance.state'

function subscribe(onChange: () => void) {
  return appearance$.colorMode.onChange(onChange)
}

const getSnapshot = (): ColorMode => appearance$.colorMode.peek()
// Must match what the server renders so hydration doesn't keep stale attributes.
const getServerSnapshot = (): ColorMode => DEFAULT_COLOR_MODE

function ThemedSubtree({ children }: { children: ReactNode }) {
  // Server snapshot is used during hydration, then React immediately re-renders
  // with the persisted client value (Theme's wrapper attributes are not
  // patched by React when they mismatch during hydration).
  const colorMode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
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
