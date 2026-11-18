import { useHotkey } from '@tanstack/react-hotkeys'
import type { RegisterableHotkey } from '@tanstack/react-hotkeys'

export type ShortcutOptions = {
  /** Turn the shortcut off without unmounting. Default `true`. */
  isEnabled?: boolean
  /** Fire while a dialog, menu, listbox or open popup is showing. Default `false`. */
  allowInOverlays?: boolean
}

const OVERLAY_SELECTOR =
  'dialog[open], [role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"], [aria-expanded="true"][aria-haspopup]'

/**
 * A dialog, menu, listbox or popup is actually showing. Hidden or empty popup
 * containers left in the DOM don't count.
 */
function isOverlayOpen(): boolean {
  if (typeof document === 'undefined') return false
  for (const el of document.querySelectorAll(OVERLAY_SELECTOR)) {
    if (el.checkVisibility?.() ?? true) return true
  }
  return false
}

/**
 * App keyboard shortcut on top of TanStack Hotkeys. TanStack skips plain keys
 * while focus is in a field and ignores key repeat; this adds a guard so
 * shortcuts stay quiet while a dialog or menu is open.
 *
 *   useShortcut('C', openCreateLink)
 *   useShortcut('Escape', goBack)
 *   useShortcut('Mod+Enter', submit, { allowInOverlays: true })
 *
 * `Escape` and `Mod+…` fire from inside fields; single letters do not.
 */
export function useShortcut(
  hotkey: RegisterableHotkey,
  handler: (event: KeyboardEvent) => void,
  { isEnabled = true, allowInOverlays = false }: ShortcutOptions = {},
) {
  useHotkey(
    hotkey,
    (event) => {
      if (event.repeat) return
      if (!allowInOverlays && isOverlayOpen()) return
      event.preventDefault()
      handler(event)
    },
    { enabled: isEnabled, preventDefault: false, stopPropagation: false },
  )
}
