import * as auth from './procedures/auth'
import * as domains from './procedures/domains'
import * as links from './procedures/links'
import * as organizations from './procedures/organizations'
import * as system from './procedures/system'

export const contract = {
  system,
  auth,
  organizations,
  domains,
  links,
} as const
