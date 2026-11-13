import { useEffect, useState, type ReactElement } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { DASHBOARD_SURFACE_BG } from '#/components/dashboard/layout/dashboard-shell-colors'
import NotFoundIllustration from '#/components/not-found/NotFoundIllustration'

type NotFoundPageProps = {
  /**
   * Route that rendered the 404. At the root it fills the window; inside a
   * layout (e.g. the dashboard) it fills that layout's content area instead.
   */
  routeId?: string
}

/** Default 404 for every unknown URL (wired up as defaultNotFoundComponent). */
export default function NotFoundPage({ routeId }: NotFoundPageProps): ReactElement {
  const isFullPage = !routeId || routeId === '__root__'

  // Browser-only details, read after mount so SSR and hydration match.
  // (No typed router hooks here: router.tsx imports this component, and
  // using them would make the router's type depend on itself.)
  const [pathname, setPathname] = useState<string | null>(null)
  const [canGoBack, setCanGoBack] = useState(false)
  useEffect(() => {
    setPathname(window.location.pathname)
    setCanGoBack(window.history.length > 1)
  }, [])

  return (
    <main
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        minHeight: isFullPage ? '100dvh' : '70vh',
        padding: '48px 24px',
        boxSizing: 'border-box',
        backgroundColor: isFullPage ? DASHBOARD_SURFACE_BG : undefined,
      }}
    >
      <VStack gap={8} hAlign="center" style={{ maxWidth: 520, textAlign: 'center' }}>
        <div>
          <NotFoundIllustration width={280} />
        </div>

        <VStack gap={3} hAlign="center">
          <Text
            type="supporting"
            color="secondary"
            weight="semibold"
            style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}
          >
            Error 404
          </Text>
          <Heading level={1}>This link went nowhere</Heading>
          <Text color="secondary">
            The page you’re looking for doesn’t exist, was moved, or the address
            has a typo.
          </Text>
          {pathname ? (
          <code
            style={{
              marginTop: 4,
              maxWidth: '100%',
              padding: '4px 10px',
              borderRadius: 8,
              background: 'var(--color-background-muted)',
              border: '1px solid var(--color-border)',
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              overflowWrap: 'anywhere',
            }}
          >
            {pathname}
          </code>
          ) : null}
        </VStack>

        <HStack gap={2} hAlign="center" wrap="wrap">
          {canGoBack ? (
            <Button
              variant="secondary"
              label="Go back"
              onClick={() => window.history.back()}
            />
          ) : null}
          <Button
            variant="primary"
            label="Go to dashboard"
            href="/dashboard"
          />
        </HStack>
      </VStack>
    </main>
  )
}
