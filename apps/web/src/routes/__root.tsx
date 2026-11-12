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
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
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
