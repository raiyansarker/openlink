import type { ReactNode } from 'react'
import { BottomSheet } from '@astryxdesign/core/BottomSheet'
import { Drawer, DrawerHeader } from '@astryxdesign/core/Drawer'
import type { DialogPurpose } from '@astryxdesign/core/Dialog'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import {
  FLOATING_END_DRAWER_PADDING,
  floatingEndDrawerStyle,
} from '#/components/members/floating-end-drawer'
import { useIsPhone } from '#/hooks/use-is-phone'

/** App-standard close ("×") for the phone sheet header. */
function CloseIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.35}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4.5 4.5l7 7m0-7l-7 7" />
    </svg>
  )
}

type ResponsiveDetailSheetProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  /** Accessible name for the panel (Drawer label / sheet label). */
  label: string
  /** Title shown in the header row on both surfaces. */
  title: ReactNode
  /** Optional second line under the title. */
  subtitle?: ReactNode
  /** Desktop panel width in px; the phone sheet is always full-width. */
  width?: number
  /** Escape/scrim semantics, shared by both surfaces. */
  purpose?: DialogPurpose
  /** Action row: pinned desktop footer (LayoutFooter), bottom of the phone sheet. */
  footer?: ReactNode
  /** Desktop only: hairline above the pinned footer (phone always draws one). */
  hasFooterDivider?: boolean
  /** Scrollable body. */
  children?: ReactNode
}

/**
 * The one detail panel in this app, on both surfaces:
 *
 * - Desktop: the floating right-side drawer (`side="end"`, inset + rounded,
 *   like Settings) with a DrawerHeader and pinned LayoutFooter.
 * - Phones: a modal bottom sheet that rises from the bottom — the same
 *   treatment as the workspace and account sheets. A right-edge drawer on a
 *   phone is unreadable; iOS presents details this way.
 *
 * Callers keep a single content tree; only the chrome changes.
 */
export default function ResponsiveDetailSheet({
  isOpen,
  onOpenChange,
  label,
  title,
  subtitle,
  width = 420,
  purpose,
  footer,
  hasFooterDivider,
  children,
}: ResponsiveDetailSheetProps) {
  const isPhone = useIsPhone()

  if (isPhone) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        label={label}
        purpose={purpose}
        height="capped"
      >
        <VStack gap={6} hAlign="stretch" width="100%">
          <HStack hAlign="between" vAlign="center" gap={4} width="fill">
            <VStack gap={0} hAlign="start" style={{ minWidth: 0 }}>
              <Text weight="semibold">{title}</Text>
              {subtitle ? (
                <Text type="supporting" color="secondary">
                  {subtitle}
                </Text>
              ) : null}
            </VStack>
            <button
              className="ol-focus-ring"
              type="button"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 30,
                height: 30,
                borderRadius: 999,
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                backgroundColor: 'transparent',
                color: 'inherit',
                flexShrink: 0,
              }}
            >
              <CloseIcon />
            </button>
          </HStack>

          {children}

          {footer ? (
            <VStack
              gap={3}
              hAlign="stretch"
              width="fill"
              style={{
                borderTop: 'var(--border-width) solid var(--color-border)',
                paddingTop: 12,
              }}
            >
              {footer}
            </VStack>
          ) : null}
        </VStack>
      </BottomSheet>
    )
  }

  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      label={label}
      side="end"
      width={width}
      hasScrim
      purpose={purpose}
      padding={FLOATING_END_DRAWER_PADDING}
      style={floatingEndDrawerStyle({ isOpen })}
    >
      <Layout
        header={<DrawerHeader title={title} subtitle={subtitle} onOpenChange={onOpenChange} />}
        content={<LayoutContent>{children}</LayoutContent>}
        footer={
          footer ? (
            <LayoutFooter hasDivider={hasFooterDivider}>{footer}</LayoutFooter>
          ) : undefined
        }
      />
    </Drawer>
  )
}
