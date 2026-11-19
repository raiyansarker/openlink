import { describe, expect, test } from 'bun:test'
import { Effect, Layer } from 'effect'
import type { WorkerBindings } from '../env'
import { deliverEmail } from './delivery'
import { EmailDeliveryError, EmailProvider, type OutgoingEmail } from './provider'
import { EmailJobSeal } from './sealed-job'

const SECRET = 'test-secret-that-is-at-least-32-characters-long'
const env = { BETTER_AUTH_SECRET: SECRET, EMAIL_FROM: 'OpenLink <no-reply@example.com>' } as WorkerBindings

const sealedReset = () =>
  EmailJobSeal.seal(SECRET, {
    to: 'ada@example.com',
    message: {
      template: 'password-reset',
      props: { name: 'Ada', resetUrl: 'https://app.example.com/reset-password/tok_123', expiresIn: '1 hour', baseUrl: 'https://app.example.com', logoUrl: 'https://app.example.com/logo192.png' },
    },
  })

function fakeProvider(fail?: EmailDeliveryError) {
  const sent: { email: OutgoingEmail; idempotencyKey: string }[] = []
  const layer = Layer.succeed(EmailProvider, {
    name: 'fake',
    send: (email, { idempotencyKey }) => (fail ? Effect.fail(fail) : Effect.sync(() => void sent.push({ email, idempotencyKey }))),
  })
  return { sent, layer }
}

describe('deliverEmail', () => {
  test('decrypts, renders and sends in one go', async () => {
    const { sent, layer } = fakeProvider()
    expect(await deliverEmail(env, await sealedReset(), 'run-1', layer)).toBeNull()
    expect(sent).toHaveLength(1)
    expect(sent[0].idempotencyKey).toBe('run-1')
    expect(sent[0].email).toMatchObject({ from: env.EMAIL_FROM, to: 'ada@example.com' })
    expect(sent[0].email.html).toContain('tok_123')
    expect(sent[0].email.subject.length).toBeGreaterThan(0)
  })

  test('a failure reason never includes the provider text', async () => {
    const error = new EmailDeliveryError({ message: 'SES 400 MessageRejected: Email address is not verified: ada@example.com', retryable: false })
    const { layer } = fakeProvider(error)
    expect(await deliverEmail(env, await sealedReset(), 'run-1', layer)).toEqual({ retryable: false, reason: 'SES 400 MessageRejected' })
  })

  test('a job sealed with another secret is dropped without sending', async () => {
    const { sent, layer } = fakeProvider()
    const result = await deliverEmail({ ...env, BETTER_AUTH_SECRET: 'rotated-secret-that-is-at-least-32-chars' }, await sealedReset(), 'run-1', layer)
    expect(result).toEqual({ retryable: false, reason: 'Email job could not be decrypted' })
    expect(sent).toHaveLength(0)
  })
})
