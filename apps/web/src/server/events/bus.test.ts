import { describe, expect, test } from 'bun:test'
import { WorkspaceEvents } from '@openlink/contracts'
import { Effect } from 'effect'

import { ACTION_DEFINITIONS } from '#/server/activity/actions'
import { activityToEvent } from '#/server/activity/service'
import { EventBus, type WorkspaceEvent } from './bus'

describe('EventBus', () => {
  test('delivers to every sink, and a failing sink does not stop the others', async () => {
    const seen: string[] = []
    const off = [
      EventBus.register({ name: 'broken', deliver: () => Effect.fail(new Error('down')) }),
      EventBus.register({ name: 'ok', deliver: (event) => Effect.sync(() => void seen.push(event.type)) }),
    ]
    await Effect.runPromise(EventBus.publish(EventBus.create('link.created', 'o1', { subject: { type: 'link', label: 'x' } })))
    off.forEach((unregister) => unregister())
    await Effect.runPromise(EventBus.publish(EventBus.create('link.deleted', 'o1')))
    expect(seen).toEqual(['link.created'])
  })
})

describe('event catalogue', () => {
  test('every activity action is a workspace event', () => {
    for (const action of Object.keys(ACTION_DEFINITIONS)) expect(WorkspaceEvents.isType(action)).toBe(true)
  })

  test('activity becomes an event with its subject, actor and changes', () => {
    const event: WorkspaceEvent = activityToEvent({
      organizationId: 'o1',
      action: 'link.updated',
      actor: { type: 'member', userId: 'u1', label: 'Ada' },
      target: { type: 'link', id: 'l1', label: 'Launch' },
      changes: [{ label: 'Title', from: 'a', to: 'b' }],
    })
    expect(event).toMatchObject({
      type: 'link.updated',
      organizationId: 'o1',
      subject: { type: 'link', id: 'l1', label: 'Launch' },
      actor: { type: 'member', id: 'u1', label: 'Ada' },
      data: { changes: [{ label: 'Title', from: 'a', to: 'b' }] },
    })
  })

  test('milestones are round numbers', () => {
    expect(WorkspaceEvents.isClickMilestone(1_000)).toBe(true)
    expect(WorkspaceEvents.isClickMilestone(1_001)).toBe(false)
  })
})
