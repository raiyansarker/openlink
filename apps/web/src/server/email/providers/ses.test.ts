import { afterEach, describe, expect, test } from 'bun:test'
import { Cause, Effect, Exit } from 'effect'
import { Bindings } from '../../effect/services/bindings'
import type { EmailDeliveryError } from '../provider'
import { sesProvider } from './ses'

const env = { AWS_SES_ACCESS_KEY_ID: 'AKIDEXAMPLE', AWS_SES_SECRET_ACCESS_KEY: 'secret', AWS_SES_REGION: 'eu-west-1' }
const email = { from: 'OpenLink <no-reply@example.com>', to: 'ada@example.com', subject: 'Hi ✓', html: '<p>Hi</p>', text: 'Hi' }
const realFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = realFetch
})

function respond(status: number, errorType?: string) {
  const requests: Request[] = []
  globalThis.fetch = (async (input: Request) => {
    requests.push(input)
    const headers = errorType ? { 'x-amzn-ErrorType': `${errorType}:http://internal.amazon.com/` } : undefined
    return new Response(status === 200 ? '{"MessageId":"m-1"}' : '{"message":"no"}', { status, headers })
  }) as typeof fetch
  return requests
}

async function send(bindings: object = env) {
  const provider = await Effect.runPromise(sesProvider.pipe(Effect.provideService(Bindings, bindings as never)))
  return Effect.runPromiseExit(provider.send(email, { idempotencyKey: 'k' }))
}

const failure = (exit: Exit.Exit<void, EmailDeliveryError>) =>
  Exit.isFailure(exit) ? (Cause.squash(exit.cause) as EmailDeliveryError) : undefined

describe('sesProvider', () => {
  test('sends a signed SES v2 request', async () => {
    const requests = respond(200)
    expect(Exit.isSuccess(await send())).toBe(true)
    const [request] = requests
    expect(request.url).toBe('https://email.eu-west-1.amazonaws.com/v2/email/outbound-emails')
    expect(request.headers.get('authorization')).toContain('Credential=AKIDEXAMPLE/')
    expect(request.headers.get('authorization')).toContain('/eu-west-1/ses/aws4_request')
    const body = await request.json()
    expect(body).toMatchObject({
      FromEmailAddress: email.from,
      Destination: { ToAddresses: ['ada@example.com'] },
      Content: { Simple: { Subject: { Data: 'Hi ✓' }, Body: { Html: { Data: '<p>Hi</p>' }, Text: { Data: 'Hi' } } } },
    })
  })

  test('throttling, quota and outages are retryable; rejections are not', async () => {
    respond(429)
    expect(failure(await send())?.retryable).toBe(true)
    respond(400, 'LimitExceededException')
    expect(failure(await send())?.retryable).toBe(true)
    respond(503)
    expect(failure(await send())?.retryable).toBe(true)
    respond(400, 'MessageRejected')
    const rejected = failure(await send())
    expect(rejected?.retryable).toBe(false)
    expect(rejected?.message).toContain('MessageRejected')
  })

  test('network errors are retryable', async () => {
    globalThis.fetch = (async () => {
      throw new TypeError('network down')
    }) as unknown as typeof fetch
    expect(failure(await send())?.retryable).toBe(true)
  })

  test('is unavailable without all three settings', async () => {
    const exit = await Effect.runPromiseExit(
      sesProvider.pipe(Effect.provideService(Bindings, { AWS_SES_ACCESS_KEY_ID: 'a', AWS_SES_REGION: 'eu-west-1' } as never)),
    )
    expect(Exit.isFailure(exit) && Cause.squash(exit.cause)).toMatchObject({ _tag: 'EmailProviderUnavailable', provider: 'ses' })
  })
})
