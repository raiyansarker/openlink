import { createFileRoute } from '@tanstack/react-router'

const SCALAR_VERSION = '1.81.0'

/** Halloween: near-black backgrounds, pumpkin orange accent, purple for secondary highlights. */
const HALLOWEEN_CSS = `
.dark-mode {
  --scalar-background-1: #120a1a;
  --scalar-background-2: #1b1026;
  --scalar-background-3: #26163a;
  --scalar-background-accent: #ff7a1a22;
  --scalar-color-1: #f5ecdf;
  --scalar-color-2: #c9b8d9;
  --scalar-color-3: #8f7aa6;
  --scalar-color-accent: #ff7a1a;
  --scalar-border-color: #3a2552;
  --scalar-button-1: #ff7a1a;
  --scalar-button-1-color: #120a1a;
  --scalar-button-1-hover: #ff9442;
  --scalar-color-green: #9be15d;
  --scalar-color-red: #ff4d4d;
  --scalar-color-yellow: #ffc233;
  --scalar-color-blue: #b57bff;
  --scalar-color-orange: #ff7a1a;
  --scalar-color-purple: #b57bff;
}
`

const CONFIGURATION = JSON.stringify({ theme: 'default', forceDarkModeState: 'dark', hideDarkModeToggle: true, customCss: HALLOWEEN_CSS })

const escapeAttribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')

/** A standalone page: Scalar draws the whole thing, so none of the app's layout or CSS applies. */
const PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>OpenLink API</title>
  </head>
  <body>
    <script id="api-reference" data-url="/api/v1/openapi.json" data-configuration="${escapeAttribute(CONFIGURATION)}"></script>
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
