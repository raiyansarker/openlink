import { describe, expect, test } from 'bun:test'
import {
  LimitExceededException,
  MessageRejected,
  SendEmailCommand,
  TooManyRequestsException,
  type SendEmailCommandInput,
} from '@aws-sdk/client-sesv2'
import { Cause, Effect, Exit } from 'effect'
import { Bindings } from '../../effect/services/bindings'
import type { EmailDeliveryError } from '../provider'
import { makeSesProvider, type SesConfig } from './ses'

const env = { AWS_SES_ACCESS_KEY_ID: ' AKIDEXAMPLE ', AWS_SES_SECRET_ACCESS_KEY: 'secret\n', AWS_SES_REGION: 'eu-west-1' }
const email = { from: 'OpenLink <no-reply@example.com>', to: 'ada@example.com', subject: 'Hi ✓', html: '<p>Hi</p>', text: 'Hi' }
const metadata = (httpStatusCode: number) => ({ $metadata: { httpStatusCode } })

/** A provider whose SES client answers with `reply`; records the config and commands it saw. */
async function provider(reply: () => Promise<unknown>, bindings: object = env) {
  const configs: SesConfig[] = []
  const commands: SendEmailCommandInput[] = []
  const ses = await Effect.runPromise(
    makeSesProvider((config) => {
      configs.push(config)
      return {
        send: (async (command: SendEmailCommand) => {
          commands.push(command.input)
          return reply()
        }) as never,
      }
    }).pipe(Effect.provideService(Bindings, bindings as never)),
  )
  const send = () => Effect.runPromiseExit(ses.send(email, { idempotencyKey: 'k' }))
  return { configs, commands, send }
}

const failure = (exit: Exit.Exit<void, EmailDeliveryError>) =>
  Exit.isFailure(exit) ? (Cause.squash(exit.cause) as EmailDeliveryError) : undefined

describe('sesProvider', () => {
  test('sends a SendEmail command with trimmed credentials', async () => {
    const { configs, commands, send } = await provider(async () => ({ MessageId: 'm-1' }))
    expect(Exit.isSuccess(await send())).toBe(true)
    expect(configs).toEqual([{ accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'secret', region: 'eu-west-1' }])
    expect(commands[0]).toMatchObject({
      FromEmailAddress: email.from,
      Destination: { ToAddresses: ['ada@example.com'] },
      Content: { Simple: { Subject: { Data: 'Hi ✓' }, Body: { Html: { Data: '<p>Hi</p>' }, Text: { Data: 'Hi' } } } },
    })
  })

  test('throttling, quota and outages are retryable; rejections are not', async () => {
    const cases: [() => Error, boolean][] = [
      [() => new TooManyRequestsException({ message: 'slow down', ...metadata(429) }), true],
      [() => new LimitExceededException({ message: 'quota', ...metadata(400) }), true],
      [() => new MessageRejected({ message: 'Email address is not verified.', ...metadata(400) }), false],
    ]
    for (const [error, retryable] of cases) {
      const { send } = await provider(async () => {
        throw error()
      })
      expect(failure(await send())?.retryable).toBe(retryable)
    }
    const { send } = await provider(async () => {
      throw new MessageRejected({ message: 'Email address is not verified.', ...metadata(400) })
    })
    expect(failure(await send())?.message).toBe('SES 400 MessageRejected: Email address is not verified.')
  })

  test('errors that never reached SES are retryable', async () => {
    const { send } = await provider(async () => {
      throw new TypeError('network down')
    })
    expect(failure(await send())?.retryable).toBe(true)
  })

  test('is unavailable without all three settings', async () => {
    const exit = await Effect.runPromiseExit(
      makeSesProvider().pipe(Effect.provideService(Bindings, { AWS_SES_ACCESS_KEY_ID: 'a', AWS_SES_REGION: 'eu-west-1' } as never)),
    )
    expect(Exit.isFailure(exit) && Cause.squash(exit.cause)).toMatchObject({ _tag: 'EmailProviderUnavailable', provider: 'ses' })
  })
})
