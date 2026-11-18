import { appConfig } from '#/config/app'

/** Default page description, also used for link previews. */
export const SITE_DESCRIPTION = 'OpenLink — organization-aware link shortener dashboard'

/** Preview image for shared pages (`public/og.png`). */
export const OG_IMAGE = { url: '/og.png', width: 1200, height: 630, alt: 'OpenLink' } as const

/** Browser tab title: `{segments…} · OpenLink` */
export function formatPageTitle(...segments: string[]) {
  return [...segments, appConfig.name].join(' · ')
}

/** A route's title, repeated for Open Graph and X/Twitter so shared pages show it. */
export function createPageHead(...segments: string[]) {
  const title = formatPageTitle(...segments)
  return () => ({
    meta: [{ title }, { property: 'og:title', content: title }, { name: 'twitter:title', content: title }],
  })
}
