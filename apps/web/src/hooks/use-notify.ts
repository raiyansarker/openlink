import { useToast } from '@astryxdesign/core/Toast'
import { useMemo } from 'react'

/**
 * Transient feedback for an action (saved, failed, copied) as a toast, instead of text
 * left on the page. Error toasts stay until dismissed; info toasts hide on their own.
 */
export function useNotify() {
  const showToast = useToast()
  return useMemo(
    () => ({
      info: (message: string) => showToast({ body: message, type: 'info' }),
      error: (message: string) => showToast({ body: message, type: 'error', uniqueID: `error:${message}` }),
    }),
    [showToast],
  )
}
