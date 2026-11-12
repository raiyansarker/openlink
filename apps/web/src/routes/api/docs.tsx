import { createFileRoute } from '@tanstack/react-router'

const apiReferenceHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>OpenLink API</title>
    <link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css" />
  </head>
  <body>
    <elements-api
      apiDescriptionUrl="/api/v1/openapi.json"
      router="hash"
      layout="sidebar"
    ></elements-api>
    <script src="https://unpkg.com/@stoplight/elements/web-components.min.js"></script>
  </body>
</html>`

export const Route = createFileRoute('/api/docs')({
  server: {
    handlers: {
      GET: () =>
        new Response(apiReferenceHtml, {
          headers: { 'content-type': 'text/html; charset=utf-8' },
        }),
    },
  },
})
