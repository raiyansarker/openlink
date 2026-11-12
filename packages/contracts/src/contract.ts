import { contract as auth } from './auth'
import { contract as domains } from './domains'
import { contract as links } from './links'
import { contract as organizations } from './organizations'
import { contract as system } from './system'

export const contract = {
  system,
  auth,
  organizations,
  domains,
  links,
} as const
