import { Button } from '@astryxdesign/core/Button'
import { Heading } from '@astryxdesign/core/Heading'
import { Spinner } from '@astryxdesign/core/Spinner'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'

import { DASHBOARD_SURFACE_BG } from '#/components/dashboard/layout/dashboard-shell-colors'
import WorkspaceSettingsSkeleton from '#/components/settings/WorkspaceSettingsSkeleton'

/** `page` fills the viewport (top-level routes); `inline` sits inside an existing layout, such as a settings panel. */
export type StatusPresentation = 'page' | 'inline'

type WorkspaceStatusScreenProps = { presentation?: StatusPresentation } & (
  | { state: 'loading'; label?: string }
  | { state: 'error'; message: string; onRetry: () => void }
  | { state: 'missing' }
)

function Body(props: WorkspaceStatusScreenProps) {
  if (props.state === 'loading') {
    // Inside settings, the panel previews the shape of the page that is loading.
    if (props.presentation === 'inline') return <WorkspaceSettingsSkeleton label={props.label ?? 'Loading your workspace…'} />
    return <Spinner size="lg" label={props.label ?? 'Loading your workspace…'} />
  }
  if (props.state === 'missing') {
    return (
      <VStack gap={2} hAlign="start">
        <Heading level={4}>Workspace not found</Heading>
        <Text color="secondary" type="supporting">You are not a member of this workspace, or it no longer exists.</Text>
      </VStack>
    )
  }
  return (
    <VStack gap={3} hAlign={props.presentation === 'inline' ? 'start' : 'center'} role="alert">
      <Heading level={props.presentation === 'inline' ? 4 : 3}>Could not load your workspaces</Heading>
      <Text color="secondary">{props.message}</Text>
      <Button label="Try again" variant="primary" size={props.presentation === 'inline' ? 'sm' : 'md'} onClick={props.onRetry} />
    </VStack>
  )
}

/** Placeholder while workspaces load, or when they could not be loaded. */
export default function WorkspaceStatusScreen(props: WorkspaceStatusScreenProps) {
  if (props.presentation === 'inline') {
    // The skeleton already lines up with the page it stands in for; no extra padding.
    if (props.state === 'loading') return <Body {...props} />
    return (
      <VStack gap={0} hAlign="start" width="fill" style={{ paddingBlock: 'var(--spacing-6)' }}>
        <Body {...props} />
      </VStack>
    )
  }
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
      <Body {...props} />
    </main>
  )
}
