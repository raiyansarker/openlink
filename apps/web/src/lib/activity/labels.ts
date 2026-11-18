import type { ActivityCategory, ActivityEvent } from '#/lib/api/types'

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
  links: 'Links',
  domains: 'Domains',
  members: 'Members',
  security: 'Security',
  developers: 'API & webhooks',
}

export const ACTIVITY_SOURCE_LABELS: Record<ActivityEvent['source'], string> = {
  dashboard: 'Dashboard',
  api: 'API',
  automation: 'Automation',
}

/** "Name → Other name", with a dash for an empty side. */
export function changeSummary(change: { from: string; to: string }): string {
  return `${change.from || '—'} → ${change.to || '—'}`
}
