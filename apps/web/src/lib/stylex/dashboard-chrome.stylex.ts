import * as stylex from '@stylexjs/stylex'

export const dashboardChromeStyles = stylex.create({
  appChrome: {
    minHeight: '100dvh',
  },
  orgRail: {
    backgroundColor: 'var(--color-background-secondary)',
    borderInlineEndWidth: '1px',
    borderInlineEndStyle: 'solid',
    borderInlineEndColor: 'var(--color-border)',
    minHeight: '100%',
  },
  sideNav: {
    minWidth: '240px',
    borderInlineEndWidth: '1px',
    borderInlineEndStyle: 'solid',
    borderInlineEndColor: 'var(--color-border)',
  },
  orgSwitch: {
    display: 'flex',
    padding: 'var(--spacing-2)',
    borderRadius: 'var(--radius-md)',
    outlineWidth: '2px',
    outlineStyle: 'solid',
    outlineColor: 'transparent',
    outlineOffset: '2px',
  },
  orgSwitchActive: {
    outlineColor: 'var(--color-accent)',
  },
})
