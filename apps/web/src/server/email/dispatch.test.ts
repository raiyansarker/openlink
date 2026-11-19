import { describe, expect, test } from 'bun:test'
import { Effect, Layer } from 'effect'
import { Bindings } from '../effect/services/bindings'
import { Db } from '../effect/services/db'
import { createTestDatabase } from '../testing/sqlite'
import { EmailDispatch, EmailDispatchLive } from './dispatch'
import type { EmailJob } from './job'
import type { EmailOrigin } from './limits'

function setup() {
  const { db } = createTestDatabase()
  const jobs: EmailJob[] = []
  const bindings = {
    BETTER_AUTH_URL: 'https://app.example.com/some/path',
    EMAIL_WORKFLOW: { create: async ({ params }: { params: EmailJob }) => void jobs.push(params) },
  }
  const layer = EmailDispatchLive.pipe(
    Layer.provide(Layer.mergeAll(Layer.succeed(Bindings, bindings as never), Layer.succeed(Db, db))),
  )
  const verify = (to: string, origin?: EmailOrigin) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const dispatch = yield* EmailDispatch
        yield* dispatch.send(to, { template: 'email-verification', props: { name: 'Ada', verifyUrl: 'https://v', expiresIn: '1 hour' } }, origin)
      }).pipe(Effect.provide(layer)),
    )
  const reset = (to: string, origin?: EmailOrigin) =>
    Effect.runPromise(
      Effect.gen(function* () {
        const dispatch = yield* EmailDispatch
        yield* dispatch.send(to, { template: 'password-reset', props: { name: 'Ada', resetUrl: 'https://r', expiresIn: '1 hour' } }, origin)
      }).pipe(Effect.provide(layer)),
    )
  return { jobs, verify, reset }
}

describe('EmailDispatch', () => {
  test('starts a workflow run with the app URL and logo filled in', async () => {
    const { jobs, verify } = setup()
    await verify('  ada@example.com ')
    expect(jobs).toHaveLength(1)
    expect(jobs[0].to).toBe('ada@example.com')
    expect(jobs[0].message.props).toMatchObject({ baseUrl: 'https://app.example.com', logoUrl: 'https://app.example.com/logo192.png' })
  })

  test('one email of a kind per address per minute, case-insensitively', async () => {
    const { jobs, verify, reset } = setup()
    await verify('ada@example.com')
    await verify('ADA@example.com')
    expect(jobs).toHaveLength(1)
    // A different kind of email has its own allowance.
    await reset('ada@example.com')
    expect(jobs).toHaveLength(2)
  })

  test('caps emails triggered from one IP across addresses', async () => {
    const { jobs, verify } = setup()
    for (const to of ['a@x.co', 'b@x.co', 'c@x.co', 'd@x.co']) await verify(to, { ip: '203.0.113.9' })
    expect(jobs).toHaveLength(3)
    // Another IP is unaffected, and the refused address kept its own allowance.
    await verify('d@x.co', { ip: '198.51.100.1' })
    expect(jobs.map((job) => job.to)).toEqual(['a@x.co', 'b@x.co', 'c@x.co', 'd@x.co'])
  })

  test('skips an empty recipient without failing', async () => {
    const { jobs, verify } = setup()
    await verify('   ')
    expect(jobs).toHaveLength(0)
  })
})
