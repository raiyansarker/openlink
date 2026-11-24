import { useEffect, useState } from 'react'

import LinkApp from '../components/LinkApp'

/** Toolbar popup: the same form as the page overlay, prefilled from the active tab. */
export default function PopupApp() {
  const [tab, setTab] = useState<{ url: string; title: string } | null>(null)

  useEffect(() => {
    void chrome.tabs.query({ active: true, currentWindow: true }).then(([active]) => {
      setTab({
        url: active?.url && /^https?:/.test(active.url) ? active.url : '',
        title: active?.title ?? '',
      })
    })
  }, [])

  if (!tab) return null
  return <LinkApp initialUrl={tab.url} initialTitle={tab.title} />
}
