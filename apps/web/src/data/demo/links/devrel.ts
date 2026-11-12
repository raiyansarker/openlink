import type { ShortLink } from '../types'

export const devrelDemoLinks: ShortLink[] = [
  {
    id: 'lnk_07',
    orgId: 'org_devrel',
    slug: 'meetup',
    title: 'Local meetup RSVP',
    targetUrl: 'https://devrel.example/events/meetup',
    clicks: 156,
    uniqueClicks: 132,
    createdAt: '2026-11-08T18:00:00Z',
    status: 'active',
    tags: ['events'],
  },
  {
    id: 'lnk_08',
    orgId: 'org_devrel',
    slug: 'discord',
    title: 'Community Discord',
    targetUrl: 'https://discord.gg/example',
    clicks: 402,
    uniqueClicks: 389,
    createdAt: '2026-02-14T12:00:00Z',
    status: 'archived',
    tags: ['community'],
  },
]
