import { describe, expect, test } from 'bun:test'
import { Effect, Layer } from 'effect'
import { Bindings } from '../effect/services/bindings'
import { Db } from '../effect/services/db'
import { createTestDatabase } from '../testing/sqlite'
import { EmailDispatch, EmailDispatchLive } from './dispatch'
import type { EmailEvent } from './events'
import type { EmailOrigin } from './limits'

function setup() {
  const { db } = createTestDatabase()
  const runs: EmailEvent[] = []
  const bindings = { EMAIL_WORKFLOW: { create: async ({ params }: { params: EmailEvent }) => void runs.push(params) } }
  const layer = EmailDispatchLive.pipe(
    Layer.provide(Layer.mergeAll(Layer.succeed(Bindings, bindings as never), Layer.succeed(Db, db))),
  )
  const emit = (to: string, event: EmailEvent, origin?: EmailOrigin) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const dispatch = yield* EmailDispatch
        yield* dispatch.send(to, event, origin)
      }).pipe(Effect.provide(layer)),
    )
  const verify = (to: string, origin?: EmailOrigin) => emit(to, { type: 'email-verification', userId: `user:${to.trim().toLowerCase()}` }, origin)
  const reset = (to: string, origin?: EmailOrigin) => emit(to, { type: 'password-reset', userId: `user:${to.trim().toLowerCase()}` }, origin)
  return { runs, verify, reset }
}

describe('EmailDispatch', () => {
  test('starts a run whose params are the event alone: no address, name or link', async () => {
    const { runs, verify } = setup()
    await verify('  ada@example.com ')
    expect(runs).toEqual([{ type: 'email-verification', userId: 'user:ada@example.com' }])
  })

  test('one email of a kind per address per minute, case-insensitively', async () => {
    const { runs, verify, reset } = setup()
    await verify('ada@example.com')
    await verify('ADA@example.com')
    expect(runs).toHaveLength(1)
    // A different kind of email has its own allowance.
    await reset('ada@example.com')
    expect(runs).toHaveLength(2)
  })

  test('caps emails triggered from one IP across addresses', async () => {
    const { runs, verify } = setup()
    for (const to of ['a@x.co', 'b@x.co', 'c@x.co', 'd@x.co']) await verify(to, { ip: '203.0.113.9' })
    expect(runs).toHaveLength(3)
    // Another IP is unaffected, and the refused address kept its own allowance.
    await verify('d@x.co', { ip: '198.51.100.1' })
    expect(runs).toHaveLength(4)
  })

  test('skips an empty recipient without failing', async () => {
    const { runs, verify } = setup()
    await verify('   ')
    expect(runs).toHaveLength(0)
  })
})
