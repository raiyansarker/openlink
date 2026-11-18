import { useState } from 'react'

/**
 * A number that goes up each time a dialog or drawer opens (or reopens for a
 * different `identity`, such as another row). Use it as a `key` on the form
 * inside, so every opening starts from fresh state without an Effect that
 * resets it after the first render.
 *
 *   const session = useOpenSession(isOpen)
 *   <Dialog isOpen={isOpen}><Form key={session} /></Dialog>
 *
 * `Dialog` and `Drawer` keep their children mounted while closed, so a `key`
 * is what makes the form start over.
 */
export function useOpenSession(isOpen: boolean, identity: unknown = null): number {
  const [seen, setSeen] = useState({ session: 0, isOpen, identity })
  if (seen.isOpen !== isOpen || seen.identity !== identity) {
    const opened = isOpen && (!seen.isOpen || seen.identity !== identity)
    // Updating state while rendering is React's documented way to react to a
    // prop change: it re-renders at once, before anything is painted.
    setSeen({ session: opened ? seen.session + 1 : seen.session, isOpen, identity })
  }
  return seen.session
}
