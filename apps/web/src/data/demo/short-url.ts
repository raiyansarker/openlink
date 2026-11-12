import {
  DEMO_SHORT_LINK_SCHEME,
  DEMO_SHORT_LINK_SUFFIX,
} from './constants'
import type { Organization } from './types'

export function shortUrlFor(slug: string, org: Organization): string {
  return `${DEMO_SHORT_LINK_SCHEME}://${org.slug}.${DEMO_SHORT_LINK_SUFFIX}/${slug}`
}
