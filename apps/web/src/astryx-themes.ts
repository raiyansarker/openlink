/**
 * @astryx-theme-record {"themes":{"neutral":"@astryxdesign/theme-neutral"},"defaultThemeSlug":"neutral"}
 *
 * The OpenLink theme is precompiled (`bun run theme:build`) so its CSS is
 * present at first paint instead of being injected at runtime.
 */

import { openlinkNeutralTheme } from '#/themes/openlink-neutral'
import '@astryxdesign/theme-neutral/theme.css'
import '#/themes/openlink-neutral.css'

export const themes = {
  'openlink-neutral': openlinkNeutralTheme,
} as const
export type ThemeSlug = keyof typeof themes

export const defaultThemeSlug: keyof typeof themes = 'openlink-neutral'
