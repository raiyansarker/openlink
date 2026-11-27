import { useState, type ReactNode } from 'react'
import { Map, type MapProps } from '@vis.gl/react-maplibre'
import { Card } from '@astryxdesign/core/Card'
import { Center } from '@astryxdesign/core/Center'
import { Text } from '@astryxdesign/core/Text'
import { useClientValue } from '#/hooks/use-client-value'
import { useResolvedColorScheme } from '#/hooks/use-resolved-color-scheme'
import { OPENFREEMAP_STYLES, loadMapLibre } from '#/lib/maps/load-maplibre'

type StaticMapProps = Pick<MapProps, 'initialViewState' | 'renderWorldCopies'> & {
  height: number
  /** Accessible description of what the map shows. */
  label: string
  /** Sources, layers and markers. */
  children?: ReactNode
}

/**
 * A non-interactive OpenFreeMap view in a card, following the app's colour
 * scheme. It fades in after the first full render so blank tiles never flash.
 */
export default function StaticMap({ height, label, children, ...view }: StaticMapProps) {
  const scheme = useResolvedColorScheme()
  const [isReady, setIsReady] = useState(false)
  const [hasError, setHasError] = useState(false)
  const reduceMotion = useClientValue(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    false,
  )

  return (
    <Card
      padding={0}
      variant="muted"
      height={height}
      role="img"
      aria-label={label}
      style={{ width: '100%', overflow: 'hidden', position: 'relative' }}
    >
      {hasError ? (
        <Center height="100%">
          <Text type="supporting" color="secondary">
            Map unavailable
          </Text>
        </Center>
      ) : (
        <Map
          mapLib={loadMapLibre()}
          mapStyle={OPENFREEMAP_STYLES[scheme]}
          {...view}
          interactive={false}
          attributionControl={false}
          fadeDuration={0}
          style={{
            width: '100%',
            height: '100%',
            opacity: isReady ? 1 : 0,
            transition: reduceMotion ? 'none' : 'opacity 180ms ease-out',
          }}
          onIdle={() => setIsReady(true)}
          onError={() => {
            // Sources can fail while React renders them; report it afterwards.
            if (!isReady) queueMicrotask(() => setHasError(true))
          }}
        >
          {children}
        </Map>
      )}
    </Card>
  )
}
