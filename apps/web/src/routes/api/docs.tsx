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

export const Route = createFileRoute('/api/docs')({
  head: () => ({
    meta: [{ title: 'OpenLink API' }],
    links: [{ rel: 'stylesheet', href: ELEMENTS_STYLES }],
  }),
  component: ApiDocsPage,
})

function ApiDocsPage() {
  useStoplightElementsScript()

  return (
    <main className="h-dvh w-full overflow-hidden bg-white">
      <elements-api
        apiDescriptionUrl="/api/v1/openapi.json"
        router="hash"
        layout="sidebar"
        className="block h-full min-h-0 w-full"
      />
    </main>
  )
}
