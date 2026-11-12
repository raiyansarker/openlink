import type { CSSProperties } from 'react'

/** Gap between the viewport edge and a right-side drawer panel. */
export const FLOATING_END_DRAWER_INSET_PX = 12
export const FLOATING_END_DRAWER_RADIUS_PX = 12

/** Inner padding for drawer Layout regions (spacing scale step). */
export const FLOATING_END_DRAWER_PADDING = 6 as const

/**
 * Overrides Drawer’s full-bleed fixed positioning so the panel floats inset from
 * the top, bottom, and right. Use with Drawer `padding` for content inset.
 */
export function floatingEndDrawerStyle(
  extra?: CSSProperties,
): CSSProperties {
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
    ...extra,
  }
}
