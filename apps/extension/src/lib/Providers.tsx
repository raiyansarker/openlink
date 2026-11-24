import { Theme } from '@astryxdesign/core/theme'
import type { ReactNode } from 'react'

// Same compiled theme the web app uses (apps/web/src/themes).
import { openlinkNeutralTheme } from '../../../web/src/themes/openlink-neutral'

import './theme.css'

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <Theme theme={openlinkNeutralTheme} mode="system">
      {children}
    </Theme>
  )
}
