import type { ReactNode } from 'react'
import { BottomSheet } from '@astryxdesign/core/BottomSheet'
import { Drawer, DrawerHeader } from '@astryxdesign/core/Drawer'
import type { DialogPurpose } from '@astryxdesign/core/Dialog'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { VStack } from '@astryxdesign/core/VStack'
import {
  FLOATING_END_DRAWER_PADDING,
  floatingEndDrawerStyle,
} from '#/components/members/floating-end-drawer'
import { useIsPhone } from '#/hooks/use-is-phone'

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
    // No nav bar: iOS sheets aren't titled — the content identifies itself,
    // and a header that scrolls away (or doesn't) reads as a bug. Escape,
    // the scrim and the grab bar all dismiss; actions pin to the bottom.
    return (
      <BottomSheet
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        label={label}
        purpose={purpose}
        height="capped"
      >
        {/* Astryx's sheet body is the scroller (its own design intent) and
            sticky positions against it — measured: with a nested scroller,
            phones showed a second scrollbar INSIDE the content ("something
            overflowing"); the native region alone scrolls the whole body.
            The sticky bar paints --color-background-surface, which is the
            sheet panel's exact fill, so content scrolls under it with no
            color band at the seam. */}
        <VStack gap={6} hAlign="stretch" width="100%">
          {children}
          {footer ? (
            <div className="ol-sheet-footer">
              <div className="ol-sheet-footer-actions">{footer}</div>
            </div>
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
