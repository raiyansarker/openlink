import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'

import LinkApp from '../components/LinkApp'
import Providers from '../lib/Providers'
import { OVERLAY_MESSAGE } from '../lib/overlay'

const params = new URLSearchParams(location.search)

function post(message: Record<string, unknown>) {
  window.parent.postMessage({ source: OVERLAY_MESSAGE, ...message }, '*')
}

/** Reports the card's height to the host page (which sizes the iframe) and closes on Escape. */
function Overlay() {
  useEffect(() => {
    const observer = new ResizeObserver(() => post({ type: 'resize', height: document.body.scrollHeight }))
    observer.observe(document.body)
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && post({ type: 'close' })
    window.addEventListener('keydown', onKey)
    return () => {
      observer.disconnect()
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <LinkApp initialUrl={params.get('url') ?? ''} initialTitle={params.get('title') ?? ''} onClose={() => post({ type: 'close' })} />
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Providers>
      <Overlay />
    </Providers>
  </React.StrictMode>,
)
