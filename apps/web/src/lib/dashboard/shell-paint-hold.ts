import { PHONE_QUERY } from '#/hooks/use-is-phone'

/**
 * The responsive shell is chosen by a JS media query (`useMediaQuery`), but
 * the server always renders the DESKTOP tree — it cannot know the viewport
 * width. Unheld, a phone reload paints the desktop shell first, then swaps
 * to the mobile shell once hydration runs `matchMedia`: the desktop→mobile
 * flash.
 *
 * `COLOR_MODE_BOOTSTRAP_SCRIPT` solves the same class of problem for color
 * mode; this is its sibling for the shell. An inline script in the SSR'd
 * <head> runs before first paint: on phone widths it flags <html>, one CSS
 * rule holds the shell's paint until React has committed the RIGHT tree,
 * and the committed shell lifts the hold. What the user gets is a brief
 * native-app-style boot frame instead of a wrong-tree flash.
 *
 * The script never adds the flag on desktop widths, and a 3s timeout lifts
 * the hold even if hydration crashes outright — the flag can never wedge
 * the page invisible.
 */
export const SHELL_HOLD_CLASS = 'ol-shell-hold'

export const SHELL_PAINT_HOLD_SCRIPT = `(function(){try{if(window.matchMedia&&window.matchMedia(${JSON.stringify(PHONE_QUERY)}).matches){var d=document.documentElement;d.classList.add(${JSON.stringify(SHELL_HOLD_CLASS)});setTimeout(function(){d.classList.remove(${JSON.stringify(SHELL_HOLD_CLASS)})},3000)}}catch(e){}})();`

/**
 * Lifted by ThreeColumnDashboardLayout once the media-query's tree — the
 * phone shell on a phone, the desktop shell on a desktop — has committed.
 * Guarded by the flag's presence so this stays a leaf effect, not state.
 */
export function releaseShellPaintHold(): void {
  document.documentElement.classList.remove(SHELL_HOLD_CLASS)
}
