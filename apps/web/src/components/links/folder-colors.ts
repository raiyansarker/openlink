/** Dropbox blue (#0061FE), lifted slightly in dark mode for contrast. */
export const FOLDER_BLUE = 'light-dark(#0061FE, #4D8DFF)'
/** Soft blue fill, mixed into the surface so it adapts to light/dark. */
export const FOLDER_CHIP_BG = `color-mix(in oklab, ${FOLDER_BLUE} 12%, var(--color-background-surface))`
export const FOLDER_CHIP_BORDER = `1px solid color-mix(in oklab, ${FOLDER_BLUE} 28%, transparent)`
