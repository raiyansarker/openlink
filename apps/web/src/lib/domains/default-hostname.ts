import { DEMO_SHORT_LINK_SUFFIX } from '#/data/demo/constants'
import type { Organization } from '#/data/demo/types'

/** Demo platform hostname for an organization (`{slug}.olink`). */
export function defaultOrgHostname(org: Organization): string {
  return `${org.slug}.${DEMO_SHORT_LINK_SUFFIX}`
}
