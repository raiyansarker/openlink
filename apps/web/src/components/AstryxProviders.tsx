import { Theme } from '@astryxdesign/core/theme'
import { QueryClientProvider } from '@tanstack/react-query'
import { useState, useSyncExternalStore, type ReactNode } from 'react'
import { defaultThemeSlug, themes } from '#/astryx-themes'
import { DEFAULT_COLOR_MODE, type ColorMode } from '#/lib/settings/appearance-preference'
import { AppQueryClient } from '#/lib/api/query'
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
  // One cache per browser tab; on the server, one per render so visitors never share data.
  const [queryClient] = useState(() => AppQueryClient.create())
  return (
    <QueryClientProvider client={queryClient}>
      <ThemedSubtree>{children}</ThemedSubtree>
    </QueryClientProvider>
  )
}
