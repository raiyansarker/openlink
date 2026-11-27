import type { ReactNode } from 'react'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'

/** A short explanation followed by what to do next: the body of the "check your email" style pages. */
export default function StatusPanel({ children, actions }: { children: ReactNode; actions: ReactNode }) {
  return (
    <VStack gap={5} hAlign="stretch">
      <Text color="secondary" size="sm" justify="center" role="status">
        {children}
      </Text>
      <VStack gap={2} hAlign="stretch">
        {actions}
      </VStack>
    </VStack>
  )
}
