import type { ReactNode } from 'react'
import { VStack } from '@astryxdesign/core/VStack'

/** Vertical rhythm shared by every settings page. */
export default function SettingsPage({ children }: { children: ReactNode }) {
  return (
    <VStack gap={5} hAlign="start" width="fill">
      {children}
    </VStack>
  )
}
