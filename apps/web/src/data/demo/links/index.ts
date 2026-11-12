import { acmeDemoLinks } from './acme'
import { appleDemoLinks } from './apple'
import { devrelDemoLinks } from './devrel'
import { googleDemoLinks } from './google'
import { metaDemoLinks } from './meta'
import type { ShortLink } from '../types'

export const demoLinks: ShortLink[] = [
  ...appleDemoLinks,
  ...acmeDemoLinks,
  ...devrelDemoLinks,
  ...metaDemoLinks,
  ...googleDemoLinks,
]
