import { describe, expect, mock, test } from 'bun:test'
import { Effect } from 'effect'
import type { WorkerBindings } from '#/server/env'

import { Bindings } from '#/server/effect/services/bindings'
import { recordClickEvent } from './clicks'

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
      blobs: ['org-1', 'domain-1', 'link-1'], doubles: [1], indexes: ['link-1'],
    })
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
