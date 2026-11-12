import { appConfig } from '#/config/app'

/** Browser tab title: `{segments…} · OpenLink` */
export function formatPageTitle(...segments: string[]) {
  return [...segments, appConfig.name].join(' · ')
}

export function createPageHead(...segments: string[]) {
  return () => ({
    meta: [{ title: formatPageTitle(...segments) }],
  })
}
