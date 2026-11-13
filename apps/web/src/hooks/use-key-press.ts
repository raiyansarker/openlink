import { useEffect, useRef } from 'react'

/**
 * A key combo: an `event.key` value, optionally prefixed by modifiers joined
 * with `+`. Case-insensitive.
 *
 *   'c'          plain key (Shift allowed, so "C" also matches)
 *   'Escape'     named key
 *   'mod+Enter'  ⌘ on macOS, Ctrl elsewhere (either is accepted)
 *   'shift+/'    modifiers listed must be held; unlisted ones must not
 *                (except Shift, which is only checked when listed)
 */
export type KeyCombo = string

export type KeyPressOptions = {
  /** Turn the shortcut off without unmounting. Default `true`. */
  isEnabled?: boolean
  /** Fire while focus is in a text field or editable region. Default `false`. */
  allowInInputs?: boolean
  /** Fire while a dialog, menu, listbox or open popup is showing. Default `false`. */
  allowInOverlays?: boolean
  /** Fire on auto-repeat while the key is held. Default `false`. */
  allowRepeat?: boolean
  /** Call `event.preventDefault()` when the shortcut fires. Default `true`. */
  preventDefault?: boolean
}

type ParsedCombo = {
  key: string
  mod: boolean
  meta: boolean
  ctrl: boolean
  alt: boolean
  shift: boolean
}

function parseCombo(combo: KeyCombo): ParsedCombo {
  const parts = combo.split('+').map((p) => p.trim().toLowerCase())
  // A combo ending in "+" means the plus key itself (e.g. "shift++").
  const key = combo.endsWith('+') ? '+' : (parts.pop() ?? '')
  const has = (name: string) => parts.includes(name)
  return {
    key,
    mod: has('mod'),
    meta: has('meta') || has('cmd'),
    ctrl: has('ctrl'),
    alt: has('alt') || has('option'),
    shift: has('shift'),
  }
}

function matchesCombo(event: KeyboardEvent, combo: ParsedCombo): boolean {
  if (event.key.toLowerCase() !== combo.key) return false
  if (combo.shift && !event.shiftKey) return false
  if (combo.alt !== event.altKey) return false
  if (combo.mod) {
    // Either ⌘ or Ctrl satisfies "mod"; nothing else may be held.
    return event.metaKey || event.ctrlKey
  }
  return combo.meta === event.metaKey && combo.ctrl === event.ctrlKey
}

/** Focus is somewhere the user types: a field, a select, or an editable region. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  )
}

const OVERLAY_SELECTOR =
  'dialog[open], [role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"], [aria-expanded="true"][aria-haspopup]'

/**
 * A dialog, menu, listbox or popup is actually showing. Hidden or empty popup
 * containers left in the DOM don't count.
 */
export function isOverlayOpen(): boolean {
  if (typeof document === 'undefined') return false
  for (const el of document.querySelectorAll(OVERLAY_SELECTOR)) {
    if (el.checkVisibility?.() ?? true) return true
  }
  return false
}

/**
 * Global keyboard shortcut. Runs `handler` when any of `combos` is pressed
 * anywhere on the page, and by default stays out of the way of typing,
 * overlays, key repeat, IME composition, and keys another handler already
 * consumed (`defaultPrevented`).
 *
 *   useKeyPress('c', openCreateLink)
 *   useKeyPress('Escape', goBack, { allowInInputs: true })
 *   useKeyPress('mod+Enter', submit, { allowInInputs: true })
 *   useKeyPress(['?', 'shift+/'], showHelp)
 */
export function useKeyPress(
  combos: KeyCombo | KeyCombo[],
  handler: (event: KeyboardEvent) => void,
  {
    isEnabled = true,
    allowInInputs = false,
    allowInOverlays = false,
    allowRepeat = false,
    preventDefault = true,
  }: KeyPressOptions = {},
) {
  // Latest callback without re-subscribing every render.
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  // Stable dependency for inline arrays like ['a', 'b'].
  const comboKey = (Array.isArray(combos) ? combos : [combos]).join('\n')

  useEffect(() => {
    if (!isEnabled) return
    const parsed = comboKey.split('\n').map(parseCombo)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return
      if (!allowRepeat && event.repeat) return
      if (!parsed.some((combo) => matchesCombo(event, combo))) return
      if (!allowInInputs && isTypingTarget(event.target)) return
      if (!allowInOverlays && isOverlayOpen()) return
      if (preventDefault) event.preventDefault()
      handlerRef.current(event)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [comboKey, isEnabled, allowInInputs, allowInOverlays, allowRepeat, preventDefault])
}
