import { Effect } from 'effect'

type Fetch = (input: string, init: RequestInit) => Promise<Response>

/**
 * Whether a destination lets other sites show it in a frame. Many sites refuse
 * (X-Frame-Options, CSP frame-ancestors); a cloaked link to one of them would
 * be a blank page, so it gets a normal redirect instead.
 */
export class FrameCheck {
  static readonly TIMEOUT_MS = 1500

  /** Read the headers that forbid framing. */
  static allowsFraming(headers: Headers): boolean {
    const xfo = headers.get('x-frame-options')?.trim().toLowerCase()
    if (xfo === 'deny' || xfo === 'sameorigin') return false
    const csp = headers.get('content-security-policy')
    if (!csp) return true
    for (const directive of csp.split(';')) {
      const [name, ...sources] = directive.trim().split(/\s+/)
      if (name?.toLowerCase() !== 'frame-ancestors') continue
      // Only an explicit wildcard admits an arbitrary host like ours.
      return sources.some((source) => source === '*' || source === 'https:')
    }
    return true
  }

  /** Fetch the destination's headers. Anything slow or failing counts as "do not frame". */
  static frameable(url: string, fetcher: Fetch = fetch): Effect.Effect<boolean> {
    return Effect.tryPromise({
      try: async (signal) => {
        const timeout = AbortSignal.timeout(FrameCheck.TIMEOUT_MS)
        const response = await fetcher(url, {
          method: 'GET',
          redirect: 'follow',
          signal: AbortSignal.any([signal, timeout]),
          headers: { accept: 'text/html' },
        })
        await response.body?.cancel()
        return response.ok && FrameCheck.allowsFraming(response.headers)
      },
      catch: () => false,
    }).pipe(Effect.orElseSucceed(() => false))
  }
}
