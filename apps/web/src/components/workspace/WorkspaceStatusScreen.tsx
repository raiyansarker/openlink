import { Button } from '@astryxdesign/core/Button'
import { Heading } from '@astryxdesign/core/Heading'
import { Spinner } from '@astryxdesign/core/Spinner'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'

import { DASHBOARD_SURFACE_BG } from '#/components/dashboard/layout/dashboard-shell-colors'

type WorkspaceStatusScreenProps =
  | { state: 'loading'; label?: string }
  | { state: 'error'; message: string; onRetry: () => void }

/** Full-page placeholder while workspaces load, or when they could not be loaded. */
export default function WorkspaceStatusScreen(props: WorkspaceStatusScreenProps) {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: DASHBOARD_SURFACE_BG,
      }}
    >
      {props.state === 'loading' ? (
        <Spinner size="lg" label={props.label ?? 'Loading your workspace…'} />
      ) : (
        <VStack gap={3} hAlign="center" role="alert">
          <Heading level={3}>Could not load your workspaces</Heading>
          <Text color="secondary">{props.message}</Text>
          <Button label="Try again" variant="primary" onClick={props.onRetry} />
        </VStack>
      )}
    </main>
  )
}
