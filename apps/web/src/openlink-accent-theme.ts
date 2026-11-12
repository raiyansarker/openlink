import { defineTheme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'

const OPENLINK_ACCENT = '#FF4602'

/** Extends neutral with OpenLink brand accent. */
export const openlinkTheme = defineTheme({
  name: 'openlink-neutral',
  extends: neutralTheme,
  tokens: {
    '--color-accent': [OPENLINK_ACCENT, '#FF6B33'],
    '--color-accent-muted': [
      'color-mix(in oklab, #FF4602 16%, transparent)',
      'color-mix(in oklab, #FF6B33 22%, transparent)',
    ],
    '--color-on-accent': ['#ffffff', '#0b0b0b'],
  },
})
