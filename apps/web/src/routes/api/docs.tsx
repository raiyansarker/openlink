import { createFileRoute } from '@tanstack/react-router'

const SCALAR_VERSION = '1.81.0'

/** A standalone page: Scalar draws the whole thing, so none of the app's layout or CSS applies. */
const PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>OpenLink API</title>
  </head>
  <body>
    <script id="api-reference" data-url="/api/v1/openapi.json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@${SCALAR_VERSION}"></script>
  </body>
</html>
`

export const Route = createFileRoute('/api/docs')({
  server: {
    handlers: {
      GET: () => new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8' } }),
    },
  },
})
