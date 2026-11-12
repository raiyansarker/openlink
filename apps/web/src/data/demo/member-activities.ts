import type { MemberActivityEvent } from './types'

function hoursAgo(hours: number): string {
  const d = new Date()
  d.setHours(d.getHours() - hours)
  return d.toISOString()
}

function daysAgoAt(days: number, hour: number, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

/** Demo activity log with multiple events per day for grouped timeline UI. */
export function getMemberActivities(memberId: string): MemberActivityEvent[] {
  return [
    {
      id: `act_${memberId}_0`,
      memberId,
      title: 'Signed in',
      description: 'Safari on macOS',
      occurredAt: hoursAgo(2),
    },
    {
      id: `act_${memberId}_1`,
      memberId,
      title: 'Created link',
      description: 'Summer campaign landing page',
      occurredAt: hoursAgo(5),
    },
    {
      id: `act_${memberId}_2`,
      memberId,
      title: 'Viewed analytics',
      description: 'Last 7 days report',
      occurredAt: daysAgoAt(1, 16, 20),
    },
    {
      id: `act_${memberId}_3`,
      memberId,
      title: 'Updated profile',
      description: 'Changed display name',
      occurredAt: daysAgoAt(1, 9, 5),
    },
    {
      id: `act_${memberId}_4`,
      memberId,
      title: 'Invited teammate',
      description: 'Sent workspace invite',
      occurredAt: daysAgoAt(4, 11, 30),
    },
    {
      id: `act_${memberId}_5`,
      memberId,
      title: 'Joined workspace',
      description: 'Accepted invite',
      occurredAt: daysAgoAt(12, 10, 0),
    },
  ]
}
