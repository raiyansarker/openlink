import { acmeDemoLinks } from './acme'
import { gitlabDemoLinks } from './gitlab'
import { devrelDemoLinks } from './devrel'
import { googleDemoLinks } from './google'
import { metaDemoLinks } from './meta'
import type { ShortLink } from '../types'

export const demoLinks: ShortLink[] = [
  ...gitlabDemoLinks,
  ...acmeDemoLinks,
  ...devrelDemoLinks,
  ...metaDemoLinks,
  ...googleDemoLinks,
]
