import { useRouterState } from '@tanstack/react-router'
import { HStack } from '@astryxdesign/core/HStack'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { VStack } from '@astryxdesign/core/VStack'

/** Same line length as the settings fields. */
const FIELDS_MAX_WIDTH = 560

/** Title and description at the top of a settings page. */
function HeaderBones({ withAction = false }: { withAction?: boolean }) {
  return (
    <HStack hAlign="between" vAlign="start" gap={4} width="100%">
      <VStack gap={1.5} hAlign="start" style={{ flex: 1 }}>
        <Skeleton width={140} height={24} radius={2} />
        <Skeleton width={260} height={12} />
      </VStack>
      {withAction ? <Skeleton width={112} height={32} radius={2} /> : null}
    </HStack>
  )
}

/** A block heading over its content. */
function BlockHeadingBones({ index }: { index: number }) {
  return <Skeleton width={96} height={16} index={index} />
}

/** A labelled text input. */
function InputBones({ index, labelWidth = 48 }: { index: number; labelWidth?: number }) {
  return (
    <VStack gap={1.5} hAlign="stretch" width="100%">
      <Skeleton width={labelWidth} height={12} index={index} />
      <Skeleton width="100%" height={36} radius={2} index={index} />
    </VStack>
  )
}

/** Title and description on the left, a button on the right. */
function ActionRowBones({ index }: { index: number }) {
  return (
    <HStack hAlign="between" vAlign="center" gap={4} width="100%">
      <VStack gap={1.5} hAlign="start" style={{ flex: 1 }}>
        <Skeleton width="38%" height={14} index={index} />
        <Skeleton width="62%" height={12} index={index} />
      </VStack>
      <Skeleton width={72} height={32} radius={2} index={index} />
    </HStack>
  )
}

/** Table rows: avatar and name, a second column, and a narrow one. */
function TableRowsBones({ count, withAvatar }: { count: number; withAvatar: boolean }) {
  return (
    <VStack gap={0} hAlign="stretch" width="100%">
      {Array.from({ length: count }, (_, i) => (
        <HStack
          key={i}
          gap={4}
          vAlign="center"
          width="100%"
          style={{ paddingBlock: 'var(--spacing-3)', borderBottom: '1px solid var(--color-border)' }}
        >
          <HStack gap={3} vAlign="center" style={{ flex: 1 }}>
            {withAvatar ? <Skeleton width={32} height={32} radius="rounded" index={i} /> : null}
            <Skeleton width="55%" height={14} index={i} />
          </HStack>
          <Skeleton width="22%" height={12} index={i} />
          <Skeleton width={80} height={12} index={i} />
        </HStack>
      ))}
    </VStack>
  )
}

/** General: logo, name and URL, danger zone. */
function GeneralBones() {
  return (
    <VStack gap={8} hAlign="stretch" width="100%" style={{ maxWidth: FIELDS_MAX_WIDTH }}>
      <HeaderBones />
      <VStack gap={3} hAlign="stretch" width="100%">
        <BlockHeadingBones index={1} />
        <HStack gap={4} vAlign="center">
          <Skeleton width={64} height={64} radius={4} index={1} />
          <VStack gap={2} hAlign="start">
            <HStack gap={2}>
              <Skeleton width={72} height={32} radius={2} index={1} />
              <Skeleton width={72} height={32} radius={2} index={1} />
            </HStack>
            <Skeleton width={220} height={12} index={1} />
          </VStack>
        </HStack>
      </VStack>
      <VStack gap={4} hAlign="stretch" width="100%">
        <BlockHeadingBones index={2} />
        <InputBones index={2} labelWidth={40} />
        <InputBones index={2} labelWidth={32} />
      </VStack>
      <VStack gap={5} hAlign="stretch" width="100%">
        <BlockHeadingBones index={3} />
        <ActionRowBones index={3} />
        <ActionRowBones index={3} />
        <ActionRowBones index={3} />
      </VStack>
    </VStack>
  )
}

/** Members: title with invite, search, people table. */
function MembersBones() {
  return (
    <VStack gap={5} hAlign="stretch" width="100%">
      <HStack hAlign="between" vAlign="center" gap={4} width="100%">
        <Skeleton width={200} height={28} radius={2} />
        <Skeleton width={120} height={32} radius={2} />
      </HStack>
      <InputBones index={1} labelWidth={140} />
      <TableRowsBones count={5} withAvatar />
    </VStack>
  )
}

/** API keys and webhooks: title with an action, then a table. */
function ListPageBones() {
  return (
    <VStack gap={5} hAlign="stretch" width="100%">
      <HeaderBones withAction />
      <TableRowsBones count={3} withAvatar={false} />
    </VStack>
  )
}

/**
 * Placeholder while the workspace loads under a workspace settings page,
 * shaped like the page that is coming.
 */
export default function WorkspaceSettingsSkeleton({ label = 'Loading your workspace…' }: { label?: string }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const page = pathname.split('/').filter(Boolean).at(-1)
  return (
    <VStack hAlign="stretch" width="100%" role="status" aria-label={label} aria-busy>
      {page === 'members' ? <MembersBones /> : page === 'api-keys' || page === 'integrations' ? <ListPageBones /> : <GeneralBones />}
    </VStack>
  )
}
