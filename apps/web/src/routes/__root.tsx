import {
  HeadContent,
  Scripts,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import AstryxProviders from '#/components/AstryxProviders'
import NotFoundPage from '#/components/not-found/NotFoundPage'
import { COLOR_MODE_BOOTSTRAP_SCRIPT } from '#/lib/settings/color-mode-bootstrap'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'OpenLink',
      },
      {
        name: 'description',
        content: 'OpenLink — organization-aware link shortener dashboard',
      },
      { name: 'theme-color', content: '#FAFAF7', media: '(prefers-color-scheme: light)' },
      { name: 'theme-color', content: '#111418', media: '(prefers-color-scheme: dark)' },
      { property: 'og:title', content: 'OpenLink' },
      { property: 'og:image', content: '/og.png' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [
      // Black logo on light browser themes, white on dark. Chrome and Firefox honor `media` on icons.
      { rel: 'icon', href: '/favicon-black.png', type: 'image/png', media: '(prefers-color-scheme: light)' },
      { rel: 'icon', href: '/favicon-white.png', type: 'image/png', media: '(prefers-color-scheme: dark)' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/manifest.json' },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
  // Every unknown URL (and every thrown notFound() without its own handler)
  // gets the same 404.
  notFoundComponent: ({ routeId }) => <NotFoundPage routeId={String(routeId)} />,
})

function RootDocument({ children }: { children: ReactNode }) {
  const isApiDocs = useRouterState({
    select: (state) => state.location.pathname === '/api/docs',
  })

  return (
    <html lang="en" className={isApiDocs ? 'api-docs-page' : undefined}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: COLOR_MODE_BOOTSTRAP_SCRIPT }} />
        <HeadContent />
      </head>
      <body className={isApiDocs ? 'api-docs-page' : undefined}>
        {isApiDocs ? (
          children
        ) : (
          <AstryxProviders>{children}</AstryxProviders>
        )}
        {!isApiDocs ? (
          <TanStackDevtools
            config={{
              position: 'bottom-right',
              urlFlag: 'debug',
              requireUrlFlag: true,
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        ) : null}
        <Scripts />
      </body>
    </html>
  )
}
