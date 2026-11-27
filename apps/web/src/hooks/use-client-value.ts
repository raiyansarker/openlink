import { useSyncExternalStore } from 'react'

const subscribeNever = () => () => {}

/**
 * A value only the browser can know (the clock, `navigator`, a media query),
 * read without a flash or a hydration mismatch: the server and the first
 * client render use `serverValue`, then React switches to the real value.
 */
export function useClientValue<T>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(subscribeNever, read, () => serverValue)
}
