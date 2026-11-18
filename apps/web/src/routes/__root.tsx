import {
  HeadContent,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import AppDevtools from '#/components/AppDevtools'
import AstryxProviders from '#/components/AstryxProviders'
import NotFoundPage from '#/components/not-found/NotFoundPage'
import { appConfig } from '#/config/app'
import { OG_IMAGE, SITE_DESCRIPTION } from '#/lib/page-title'
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
      { name: 'description', content: SITE_DESCRIPTION },
      { name: 'theme-color', content: '#FAFAF7', media: '(prefers-color-scheme: light)' },
      { name: 'theme-color', content: '#111418', media: '(prefers-color-scheme: dark)' },
      // Open Graph (Facebook, LinkedIn, Slack, …) and X/Twitter cards.
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: appConfig.name },
      { property: 'og:title', content: appConfig.name },
      { property: 'og:description', content: SITE_DESCRIPTION },
      { property: 'og:image', content: OG_IMAGE.url },
      { property: 'og:image:width', content: String(OG_IMAGE.width) },
      { property: 'og:image:height', content: String(OG_IMAGE.height) },
      { property: 'og:image:alt', content: OG_IMAGE.alt },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: appConfig.name },
      { name: 'twitter:description', content: SITE_DESCRIPTION },
      { name: 'twitter:image', content: OG_IMAGE.url },
      { name: 'twitter:image:alt', content: OG_IMAGE.alt },
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
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: COLOR_MODE_BOOTSTRAP_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        <AstryxProviders>
          {children}
          <AppDevtools />
        </AstryxProviders>
        <Scripts />
      </body>
    </html>
  )
}
