import type { CSSProperties } from 'react'

/** Gap between the viewport edge and a right-side drawer panel. */
export const FLOATING_END_DRAWER_INSET_PX = 12
export const FLOATING_END_DRAWER_RADIUS_PX = 12

/** Inner padding for drawer Layout regions (spacing scale step). */
export const FLOATING_END_DRAWER_PADDING = 6 as const

/**
 * Overrides Drawer’s full-bleed fixed positioning so the panel floats inset from
 * the top, bottom, and right. Use with Drawer `padding` for content inset.
 *
 * The Drawer closes by sliding its own width (`translateX(100%)`), which on its
 * own leaves the inset and the shadow on screen. While closed, the panel moves
 * a little further with `translate`, which composes with the Drawer's
 * transform and animates on the same timing.
 */
export function floatingEndDrawerStyle(
  extra?: CSSProperties & { isOpen?: boolean },
): CSSProperties {
  const { isOpen = true, ...rest } = extra ?? {}
  const inset = FLOATING_END_DRAWER_INSET_PX
  return {
    top: inset,
    bottom: inset,
    right: inset,
    left: 'auto',
    height: `calc(100dvh - ${inset * 2}px)`,
    maxHeight: `calc(100dvh - ${inset * 2}px)`,
    borderRadius: FLOATING_END_DRAWER_RADIUS_PX,
    overflow: 'hidden',
    boxSizing: 'border-box',
    translate: isOpen ? '0 0' : `${inset + CLOSED_SHADOW_CLEARANCE_PX}px 0`,
    transitionProperty: 'transform, translate',
    ...rest,
  }
}

/** Extra distance while closed so the panel's shadow leaves the screen too. */
const CLOSED_SHADOW_CLEARANCE_PX = 32
