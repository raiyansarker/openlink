import type { Organization } from './types'

export const demoOrganizations: Organization[] = [
  {
    id: 'org_openlink',
    name: 'OpenLink Labs',
    slug: 'openlink-labs',
    plan: 'pro',
    memberCount: 8,
  },
  {
    id: 'org_acme',
    name: 'Acme Marketing',
    slug: 'acme-marketing',
    plan: 'enterprise',
    memberCount: 24,
  },
  {
    id: 'org_devrel',
    name: 'DevRel Guild',
    slug: 'devrel-guild',
    plan: 'free',
    memberCount: 3,
  },
]
