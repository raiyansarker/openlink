import { HStack } from '@astryxdesign/core/HStack'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { VStack } from '@astryxdesign/core/VStack'

/** Same line length as the settings fields. */
const FIELDS_MAX_WIDTH = 560

type SettingsSkeletonProps = {
  /**
   * `fields` previews titled blocks of inputs (profile, workspace).
   * `list` previews a heading, a search box and rows (a whole list page).
   * `rows` previews just the rows, under a heading that is already shown.
   */
  variant?: 'fields' | 'list' | 'rows'
  /** Blocks for `fields`, rows for `list`. */
  count?: number
  /** Read by screen readers instead of the shapes. */
  label?: string
  /**
   * Widest the placeholder gets, matching the content it stands in for.
   * `fields` defaults to the 560px field width; lists default to the full width.
   */
  maxWidth?: number
}

/** Rows with an avatar or icon, a title and a detail line. */
function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <HStack key={i} gap={3} vAlign="center" width="100%">
          <Skeleton width={32} height={32} radius="rounded" index={i + 2} />
          <VStack gap={1.5} hAlign="start" style={{ flex: 1 }}>
            <Skeleton width="45%" height={14} index={i + 2} />
            <Skeleton width="30%" height={12} index={i + 2} />
          </VStack>
          <Skeleton width={72} height={14} index={i + 2} />
        </HStack>
      ))}
    </>
  )
}

/** Loading placeholder shaped like the settings page it stands in for. */
export default function SettingsSkeleton({ variant = 'fields', count = 3, label = 'Loading…', maxWidth }: SettingsSkeletonProps) {
  if (variant === 'rows') {
    return (
      <VStack gap={3} hAlign="stretch" width="100%" role="status" aria-label={label} aria-busy style={{ maxWidth }}>
        <SkeletonRows count={count} />
      </VStack>
    )
  }

  if (variant === 'list') {
    return (
      <VStack gap={4} hAlign="stretch" width="100%" role="status" aria-label={label} aria-busy style={{ maxWidth }}>
        <Skeleton width="40%" height={28} radius={2} />
        <Skeleton width="100%" height={36} radius={2} index={1} />
        <VStack gap={3} hAlign="stretch" width="100%">
          <SkeletonRows count={count} />
        </VStack>
      </VStack>
    )
  }

  return (
    <VStack
      gap={8}
      hAlign="stretch"
      width="100%"
      role="status"
      aria-label={label}
      aria-busy
      style={{ maxWidth: maxWidth ?? FIELDS_MAX_WIDTH }}
    >
      {Array.from({ length: count }, (_, i) => (
        <VStack key={i} gap={3} hAlign="stretch" width="100%">
          <VStack gap={1.5} hAlign="start" width="100%">
            <Skeleton width="30%" height={18} index={i} />
            <Skeleton width="65%" height={12} index={i} />
          </VStack>
          <Skeleton width="100%" height={36} radius={2} index={i} />
          {i === 0 ? <Skeleton width={96} height={32} radius={2} index={i} /> : null}
        </VStack>
      ))}
    </VStack>
  )
}
