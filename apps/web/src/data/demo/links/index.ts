import { acmeDemoLinks } from './acme'
import { devrelDemoLinks } from './devrel'
import { openlinkDemoLinks } from './openlink'
import type { ShortLink } from '../types'

export const demoLinks: ShortLink[] = [
  ...openlinkDemoLinks,
  ...acmeDemoLinks,
  ...devrelDemoLinks,
]
