import { OVERLAY_COMMAND, OVERLAY_MESSAGE } from './lib/overlay'

type FetchRequest = {
  type: 'openlink-fetch'
  url: string
  method?: string
  headers?: Record<string, string>
  body?: string
}

/** The app's cookies for one request, sent in the order a browser uses. */
async function cookieHeaderFor(url: string): Promise<string> {
  try {
    const cookies = await chrome.cookies.getAll({ url })
    return [...cookies].sort((a, b) => b.path.length - a.path.length).map((c) => `${c.name}=${c.value}`).join('; ')
  } catch {
    return ''
  }
}

/**
 * All OpenLink API calls run here, in the extension's own process, so the app's
 * sign-in cookie is attached the same way from every surface — including the
 * overlay, which is framed inside other sites and cannot rely on cookies
 * following it there. The whole response comes back over messaging.
 */
function handleFetch(message: FetchRequest, sendResponse: (answer: Record<string, unknown>) => void): boolean {
  void (async () => {
    try {
      const cookie = await cookieHeaderFor(message.url)
      const headers: Record<string, string> = { ...(message.headers ?? {}) }
      if (cookie) headers['cookie'] = cookie
      const response = await fetch(message.url, {
        method: message.method ?? 'GET',
        headers,
        ...(message.body !== undefined ? { body: message.body } : {}),
        // The service worker's own fetch also carries the app's cookie jar for
        // granted origins; identical duplicates are harmless to the app.
        credentials: 'include',
      })
      const [body, headerEntries] = await Promise.all([response.text(), Promise.resolve([...response.headers])])
      sendResponse({ status: response.status, statusText: response.statusText, headers: headerEntries, body })
    } catch (error) {
      sendResponse({ status: 0, error: error instanceof Error ? error.message : String(error) })
    }
  })()
  return true
}

chrome.runtime.onMessage.addListener((message: FetchRequest, _sender, sendResponse) => {
  if (message?.type === 'openlink-fetch') return handleFetch(message, sendResponse as (answer: Record<string, unknown>) => void)
  return false
})

/**
 * Runs inside the page (injected), so it must not reference anything outside itself.
 * Adds, or removes, a floating card in the top-right corner that hosts the extension's
 * own page in an iframe, which keeps the page's styles and scripts out of it.
 */
function toggleOverlay(base: string, message: string) {
  const ID = 'openlink-overlay'
  const existing = document.getElementById(ID) as (HTMLIFrameElement & { __cleanup?: () => void }) | null
  if (existing) {
    existing.__cleanup?.()
    return
  }

  const frame = document.createElement('iframe') as HTMLIFrameElement & { __cleanup?: () => void }
  frame.id = ID
  frame.src = `${base}?url=${encodeURIComponent(location.href)}&title=${encodeURIComponent(document.title)}`
  frame.setAttribute('allow', 'clipboard-write')
  frame.style.cssText = [
    'position:fixed',
    'top:16px',
    'right:16px',
    'width:380px',
    'height:240px',
    'max-height:calc(100vh - 32px)',
    'border:0',
    'border-radius:14px',
    'box-shadow:0 0 0 1px rgba(128,128,128,.25),0 12px 40px rgba(0,0,0,.28)',
    'z-index:2147483647',
    'overflow:hidden',
    'color-scheme:normal',
  ].join(';')

  const close = () => {
    window.removeEventListener('message', onMessage)
    document.removeEventListener('keydown', onKey, true)
    document.removeEventListener('mousedown', onOutside, true)
    frame.remove()
  }
  const onMessage = (event: MessageEvent) => {
    if (event.source !== frame.contentWindow || event.data?.source !== message) return
    if (event.data.type === 'close') close()
    if (event.data.type === 'resize' && typeof event.data.height === 'number') frame.style.height = `${event.data.height}px`
  }
  const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close()
  const onOutside = (event: MouseEvent) => event.target !== frame && close()

  frame.__cleanup = close
  window.addEventListener('message', onMessage)
  document.addEventListener('keydown', onKey, true)
  document.addEventListener('mousedown', onOutside, true)
  document.documentElement.append(frame)
  frame.focus()
}

chrome.commands.onCommand.addListener(async (command) => {
  console.info('[OpenLink] Shortcut pressed:', command)
  if (command !== OVERLAY_COMMAND) return
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  try {
    if (tab?.id === undefined || !chrome.scripting) throw new Error('no scripting')
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: toggleOverlay,
      args: [chrome.runtime.getURL('overlay/index.html'), OVERLAY_MESSAGE],
    })
  } catch (error) {
    // Pages the browser protects (chrome://, the web store) can't host the overlay; use the popup instead.
    console.warn('[OpenLink] Could not show the overlay on', tab?.url, error)
    const action = chrome.action ?? (chrome as unknown as { browserAction?: typeof chrome.action }).browserAction
    await action?.openPopup?.().catch((popupError: unknown) => console.error('[OpenLink] Could not open the popup', popupError))
  }
})

// Shortcuts are assigned once, at install. Log when the browser left ours unset (taken by another extension).
chrome.runtime.onInstalled.addListener(() => {
  void chrome.commands.getAll().then((commands) => {
    const command = commands.find((c) => c.name === OVERLAY_COMMAND)
    if (!command?.shortcut) console.warn('[OpenLink] No keyboard shortcut is assigned. Set one at chrome://extensions/shortcuts.')
  })
})
