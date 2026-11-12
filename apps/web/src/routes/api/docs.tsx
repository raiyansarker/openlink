import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

const ELEMENTS_SCRIPT =
  'https://unpkg.com/@stoplight/elements/web-components.min.js'
const ELEMENTS_STYLES =
  'https://unpkg.com/@stoplight/elements/styles.min.css'

function useStoplightElementsScript() {
  useEffect(() => {
    if (document.querySelector(`script[src="${ELEMENTS_SCRIPT}"]`)) return
    const script = document.createElement('script')
    script.src = ELEMENTS_SCRIPT
    script.async = true
    document.body.appendChild(script)
  }, [])
}

/** Ensure the Elements host re-measures when the web component boots. */
function useStoplightElementsFullHeight() {
  useEffect(() => {
    const resize = () => {
      const host = document.querySelector('elements-api')
      if (!(host instanceof HTMLElement)) return
      const parent = host.closest('.api-docs-root')
      if (!(parent instanceof HTMLElement)) return
      host.style.height = `${parent.clientHeight}px`
    }
    resize()
    const t = window.setTimeout(resize, 0)
    const t2 = window.setTimeout(resize, 300)
    window.addEventListener('resize', resize)
    return () => {
      window.clearTimeout(t)
      window.clearTimeout(t2)
      window.removeEventListener('resize', resize)
    }
  }, [])
}

export const Route = createFileRoute('/api/docs')({
  head: () => ({
    meta: [{ title: 'OpenLink API' }],
    links: [{ rel: 'stylesheet', href: ELEMENTS_STYLES }],
  }),
  component: ApiDocsPage,
})

function ApiDocsPage() {
  useStoplightElementsScript()
  useStoplightElementsFullHeight()

  return (
    <main className="api-docs-root">
      <elements-api
        apiDescriptionUrl="/api/v1/openapi.json"
        router="hash"
        layout="sidebar"
      />
    </main>
  )
}
