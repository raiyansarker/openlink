import { useSyncExternalStore } from 'react'

import { currentHostLabel } from '#/lib/url/format-host'

const SERVER_LABEL = 'your-domain.com'
const subscribe = () => () => {}

/**
 * The current host for UI examples. The server and the first client render both
 * use the placeholder, so hydration matches; the real host appears right after.
 */
export function useHostLabel(): string {
  return useSyncExternalStore(subscribe, () => currentHostLabel(SERVER_LABEL), () => SERVER_LABEL)
}
