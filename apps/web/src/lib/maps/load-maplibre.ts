/** OpenFreeMap styles matched to the app's light and dark modes. */
export const OPENFREEMAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const

/** Credit line OpenFreeMap and the OSM licence (ODbL) require wherever a map shows. */

/**
 * Loads MapLibre, its worker, and its stylesheet on the client only.
 * MapLibre touches `window`, so it must never be imported during SSR.
 */
export async function loadMapLibre() {
  const [maplibre, worker] = await Promise.all([
    import('maplibre-gl'),
    import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
    import('maplibre-gl/dist/maplibre-gl.css'),
  ])
  maplibre.setWorkerUrl(worker.default)
  return maplibre
}

/**
 * Resolves a CSS custom property to a concrete `rgb()` color for WebGL paint.
 * Tokens can hold `light-dark(…)` or nested `var()`s, which MapLibre cannot
 * parse, so let the browser compute the final color on a probe element.
 */
export function resolveCssColor(element: Element, variable: string, fallback: string): string {
  const probe = document.createElement('span')
  probe.style.display = 'none'
  probe.style.color = `var(${variable}, ${fallback})`
  element.appendChild(probe)
  const value = getComputedStyle(probe).color
  probe.remove()
  return value || fallback
}

/**
 * Start the compact attribution collapsed (just the ⓘ). MapLibre opens it the
 * first time a map loads; the credits stay one tap away, as the licences require.
 */
export function collapseAttribution(map: { getContainer(): HTMLElement; once(event: 'load', handler: () => void): unknown }) {
  map.once('load', () => {
    map.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')
  })
}
