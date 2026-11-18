import type { MouseEvent } from 'react'

/** A plain click stays in the app; modified clicks (new tab, copy) keep the real link. */
export function isPlainClick(event: MouseEvent) {
  return !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
}
