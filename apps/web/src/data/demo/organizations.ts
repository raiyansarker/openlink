import type { Organization } from './types'

export const demoOrganizations: Organization[] = [
  {
    id: 'org_apple',
    name: 'Apple',
    slug: 'apple',
    plan: 'enterprise',
    memberCount: 28,
  },
  {
    id: 'org_github',
    name: 'GitHub',
    slug: 'github',
    plan: 'free',
    memberCount: 6,
  },
  {
    id: 'org_dribbble',
    name: 'Dribbble',
    slug: 'dribbble',
    plan: 'free',
    memberCount: 4,
  },
  {
    id: 'org_meta',
    name: 'Meta',
    slug: 'meta',
    plan: 'pro',
    memberCount: 42,
  },
  {
    id: 'org_google',
    name: 'Google',
    slug: 'google',
    plan: 'enterprise',
    memberCount: 56,
  },
]
