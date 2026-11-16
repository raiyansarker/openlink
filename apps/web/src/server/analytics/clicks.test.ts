import { describe, expect, mock, test } from 'bun:test'
import { Effect } from 'effect'
import type { WorkerBindings } from '#/server/env'

import { Bindings } from '#/server/effect/services/bindings'
import { Visitor } from '#/server/redirect/visitor'
import { ClickEvent, recordClickEvent } from './clicks'

const input = { organizationId: 'org-1', domainId: 'domain-1', linkId: 'link-1' }

function provide(writeDataPoint: () => void) {
  return recordClickEvent(input).pipe(Effect.provideService(Bindings, {
    ANALYTICS: { writeDataPoint },
  } as unknown as WorkerBindings))
}

describe('recordClickEvent', () => {
  test('writes the existing payload only when the effect runs', async () => {
    const write = mock(() => {})
    const effect = provide(write)
    expect(write).not.toHaveBeenCalled()
    expect(await Effect.runPromise(effect)).toBeUndefined()
    expect(write).toHaveBeenCalledTimes(1)
    expect(write).toHaveBeenCalledWith({
      blobs: ['org-1', 'domain-1', 'link-1', '', '', 'desktop', 'Unknown browser', 'Unknown system', 'redirect', ''],
      doubles: [1],
      indexes: ['link-1'],
    })
  })

  test('describes the visitor in appended blobs', () => {
    const visitor = new Visitor(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 Version/19.0 Mobile/15E148 Safari/604.1',
      'BD',
      'https://www.t.co/abc',
    )
    const point = new ClickEvent({ ...input, visitor, delivery: 'cloak', destination: 'https://www.example.com/x' }).toDataPoint()
    expect(point.blobs).toEqual(['org-1', 'domain-1', 'link-1', 'BD', 't.co', 'mobile', 'Safari', 'iOS', 'cloak', 'example.com'])
    expect(ClickEvent.device('Mozilla/5.0 (iPad; CPU OS 19_0)')).toBe('tablet')
    expect(ClickEvent.device('Mozilla/5.0 (Linux; Android 15; SM-X810)')).toBe('tablet')
  })

  test('synchronous write failures retain the operation and original cause', async () => {
    const cause = new Error('analytics unavailable')
    const error = await Effect.runPromise(provide(() => { throw cause }).pipe(
      Effect.catchTag('BackendError', (error) => Effect.succeed(error)),
    ))
    expect(error).toMatchObject({ _tag: 'BackendError', operation: 'analytics.recordClickEvent', cause })
  })

  test('missing analytics binding is a typed failure, not a defect', async () => {
    const error = await Effect.runPromise(recordClickEvent(input).pipe(
      Effect.provideService(Bindings, {} as WorkerBindings),
      Effect.catchTag('BackendError', (error) => Effect.succeed(error)),
    ))
    expect(error).toMatchObject({ _tag: 'BackendError', operation: 'analytics.recordClickEvent' })
  })
})
