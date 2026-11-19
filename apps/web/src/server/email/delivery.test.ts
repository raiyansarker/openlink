import { describe, expect, test } from 'bun:test'
import { user } from '@openlink/db/schema'
import { Effect, Layer } from 'effect'
import type { WorkerBindings } from '../env'
import { createTestDatabase } from '../testing/sqlite'
import { deliverEmail } from './delivery'
import { EmailDeliveryError, EmailProvider, type OutgoingEmail } from './provider'

const env = {
  BETTER_AUTH_URL: 'https://app.example.com',
  BETTER_AUTH_SECRET: 'test-secret-that-is-at-least-32-characters-long',
  EMAIL_FROM: 'OpenLink <no-reply@example.com>',
} as WorkerBindings

async function setup(fail?: EmailDeliveryError) {
  const { db } = createTestDatabase()
  const now = new Date()
  await db.insert(user).values({ id: 'u1', name: 'Ada', email: 'ada@example.com', emailVerified: true, createdAt: now, updatedAt: now })
  const sent: { email: OutgoingEmail; idempotencyKey: string }[] = []
  const providerLayer = Layer.succeed(EmailProvider, {
    name: 'fake',
    send: (email, { idempotencyKey }) => (fail ? Effect.fail(fail) : Effect.sync(() => void sent.push({ email, idempotencyKey }))),
  })
  return { sent, deps: { db, providerLayer } }
}

describe('deliverEmail', () => {
  test('builds, renders and sends in one go', async () => {
    const { sent, deps } = await setup()
    expect(await deliverEmail(env, { type: 'welcome', userId: 'u1' }, 'run-1', deps)).toBeNull()
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({ idempotencyKey: 'run-1', email: { from: env.EMAIL_FROM, to: 'ada@example.com' } })
    expect(sent[0].email.html).toContain('https://app.example.com/dashboard')
  })

  test('an event that no longer applies sends nothing and does not fail', async () => {
    const { sent, deps } = await setup()
    expect(await deliverEmail(env, { type: 'welcome', userId: 'deleted' }, 'run-1', deps)).toBeNull()
    expect(await deliverEmail(env, { type: 'email-verification', userId: 'u1' }, 'run-2', deps)).toBeNull()
    // A run started by an older deploy, with the old params shape.
    expect(await deliverEmail(env, { to: 'ada@example.com', message: {} } as never, 'run-3', deps)).toBeNull()
    expect(sent).toHaveLength(0)
  })

  test('a failure reason never includes the provider text', async () => {
    const error = new EmailDeliveryError({ message: 'SES 400 MessageRejected: Email address is not verified: ada@example.com', retryable: false })
    const { deps } = await setup(error)
    expect(await deliverEmail(env, { type: 'welcome', userId: 'u1' }, 'run-1', deps)).toEqual({ retryable: false, reason: 'SES 400 MessageRejected' })
  })
})
