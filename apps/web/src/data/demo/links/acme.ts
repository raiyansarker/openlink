import type { ShortLink } from '../types'

export const acmeDemoLinks: ShortLink[] = [
  {
    id: 'lnk_05',
    orgId: 'org_acme',
    slug: 'spring-sale',
    title: 'Spring sale landing',
    targetUrl: 'https://acme.example/sale',
    clicks: 9240,
    uniqueClicks: 5102,
    createdAt: '2026-03-15T08:00:00Z',
    status: 'active',
    tags: ['retail', 'paid'],
  },
  {
    id: 'lnk_06',
    orgId: 'org_acme',
    slug: 'careers',
    title: 'Careers page',
    targetUrl: 'https://acme.example/jobs',
    clicks: 612,
    uniqueClicks: 480,
    createdAt: '2026-06-20T10:30:00Z',
    status: 'active',
    tags: ['hr'],
  },
]
