import { describe, expect, test } from 'bun:test'

import { PHONE_QUERY } from '#/hooks/use-is-phone'
import { SHELL_HOLD_CLASS, SHELL_PAINT_HOLD_SCRIPT } from './shell-paint-hold'

/*
 * The script is a string shipped raw into <head>, so its invariants are
 * asserted as strings. Each one is load-bearing:
 *  - flagging <html> with the exact class the CSS rule keys on
 *  - keying off the SAME query the React hook uses, or the hold and the
 *    swap disagree about what a "phone" is
 *  - guarding matchMedia (very old engines, odd webviews) so a broken
 *    check degrades to the old flash, never to a wedged blank page
 *  - lifting the hold on a timeout so a hydration crash cannot strand
 *    the page invisible
 */
describe('SHELL_PAINT_HOLD_SCRIPT', () => {
  test('flags the same class the CSS hold keys on', () => {
    // JSON.stringify doubles the quotes, matching the script's raw string.
    expect(SHELL_PAINT_HOLD_SCRIPT).toContain(JSON.stringify(SHELL_HOLD_CLASS))
  })

  test('uses the exact media query the React shell hook uses', () => {
    expect(SHELL_PAINT_HOLD_SCRIPT).toContain(JSON.stringify(PHONE_QUERY))
  })

  test('never throws: the matchMedia check is guarded', () => {
    expect(SHELL_PAINT_HOLD_SCRIPT).toContain('try{')
    expect(SHELL_PAINT_HOLD_SCRIPT).toContain('catch(e){}')
  })

  test('self-lifts so a dead hydration cannot wedge the page hidden', () => {
    expect(SHELL_PAINT_HOLD_SCRIPT).toContain('setTimeout')
    expect(SHELL_PAINT_HOLD_SCRIPT).toContain('remove')
  })
})
