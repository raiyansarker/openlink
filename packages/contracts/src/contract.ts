import { contract as auth } from './auth'
import { contract as domains } from './domains'
import { contract as links } from './links'
import { contract as organizations } from './organizations'
import { contract as system } from './system'
import { apiErrorMap } from './api-errors'
import { oc } from './oc'

const router = {
  system,
  auth,
  organizations,
  domains,
  links,
} as const

/** Full contract with typesafe errors on every procedure. */
export const contract = oc.errors(apiErrorMap).router(router)
