import type { WorkspaceCustomDomain } from '#/data/demo/domains'

export type DomainTimelineEvent = {
  id: string
  title: string
  description?: string
  occurredAt: string
}

export function buildDomainTimeline(
  domain: WorkspaceCustomDomain,
): DomainTimelineEvent[] {
  const events: DomainTimelineEvent[] = [
    {
      id: `${domain.id}_added`,
      title: 'Domain added',
      description: domain.hostname,
      occurredAt: domain.createdAt,
    },
  ]

  if (
    domain.readiness === 'pending' ||
    domain.readiness === 'verifying' ||
    domain.readiness === 'failed'
  ) {
    events.push({
      id: `${domain.id}_dns`,
      title:
        domain.readiness === 'failed'
          ? 'DNS check failed'
          : 'Awaiting DNS verification',
      description: 'CNAME must point at the edge host.',
      occurredAt: domain.createdAt,
    })
  }

  if (domain.readiness === 'verifying') {
    events.push({
      id: `${domain.id}_checking`,
      title: 'Verifying records',
      occurredAt: new Date(
        new Date(domain.createdAt).getTime() + 60_000,
      ).toISOString(),
    })
  }

  if (domain.readiness === 'active' && domain.activeAt) {
    events.push({
      id: `${domain.id}_active`,
      title: 'Domain active',
      description: 'Short links can use this host.',
      occurredAt: domain.activeAt,
    })
  }

  return events.sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  )
}
