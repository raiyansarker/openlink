/** OpenFreeMap styles matched to the app's light and dark modes. */
export const OPENFREEMAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const

let shared: ReturnType<typeof importMapLibre> | undefined

async function importMapLibre() {
  const [maplibre, worker] = await Promise.all([
    import('maplibre-gl'),
    import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
    import('maplibre-gl/dist/maplibre-gl.css'),
  ])
  maplibre.setWorkerUrl(worker.default)
  return maplibre
}

/**
 * MapLibre with its worker and stylesheet, for `<Map mapLib={…}>`. Loaded once,
 * on the client only: MapLibre touches `window`, so it must never load during SSR.
 */
export function loadMapLibre() {
  shared ??= importMapLibre()
  return shared
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
