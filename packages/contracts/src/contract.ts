import { contract as account } from './account'
import { contract as activity } from './activity'
import { contract as analytics } from './analytics'
import { contract as apiKeys } from './api-keys'
import { contract as auth } from './auth'
import { contract as domains } from './domains'
import { contract as folders } from './folders'
import { contract as links } from './links'
import { contract as organizations } from './organizations'
import { contract as reports } from './reports'
import { contract as system } from './system'
import { apiErrorMap } from './api-errors'
import { oc } from './oc'

const router = {
  system,
  auth,
  account,
  activity,
  analytics,
  reports,
  apiKeys,
  organizations,
  domains,
  folders,
  links,
} as const

/** Full contract with typesafe errors on every procedure. */
export const contract = oc.errors(apiErrorMap).router(router)
