import { afterAll, afterEach, describe, expect, spyOn, test } from 'bun:test'
import { Effect } from 'effect'

import { BackendError, operation } from '#/server/effect/operations'
import { EffectLogger, ErrorReport, ServerLog } from '.'

const captured: string[] = []
const spies = [
  spyOn(console, 'error').mockImplementation((line: string) => void captured.push(line)),
  spyOn(console, 'warn').mockImplementation((line: string) => void captured.push(line)),
  spyOn(console, 'log').mockImplementation((line: string) => void captured.push(line)),
]
const lines = () => captured.map((line) => JSON.parse(line) as Record<string, any>)

afterEach(() => {
  captured.length = 0
  for (const spy of spies) spy.mockClear()
})
afterAll(() => {
  for (const spy of spies) spy.mockRestore()
})

describe('ErrorReport', () => {
  test('describes a BackendError with its operation and the underlying reason', () => {
    const error = new BackendError({
      operation: 'password.deriveBits',
      cause: new Error('Pbkdf2 failed: iteration counts above 100000 are not supported'),
    })
    const description = ErrorReport.describe(error)
    expect(description.tag).toBe('BackendError')
    expect(description.operation).toBe('password.deriveBits')
    expect(ErrorReport.rootMessage(description)).toContain('iteration counts above 100000')
  })

  test('redacts passwords, tokens, cookies and secrets at any depth', () => {
    const redacted = ErrorReport.redact({
      slug: 'abc',
      password: 'hunter22',
      nested: { token: 't', authorization: 'Bearer x', list: [{ cookie: 'c' }] },
    }) as Record<string, any>
    expect(redacted.slug).toBe('abc')
    expect(redacted.password).toBe('[redacted]')
    expect(redacted.nested.token).toBe('[redacted]')
    expect(redacted.nested.authorization).toBe('[redacted]')
    expect(redacted.nested.list[0].cookie).toBe('[redacted]')
  })
})

describe('ServerLog', () => {
  test('writes one JSON line with the error and its reason', () => {
    ServerLog.error('api.procedure_failed', new Error('outer', { cause: new Error('D1_ERROR: no such table') }), { procedure: 'links.update' })
    const [entry] = lines()
    expect(entry.level).toBe('error')
    expect(entry.event).toBe('api.procedure_failed')
    expect(entry.procedure).toBe('links.update')
    expect(entry.reason).toBe('D1_ERROR: no such table')
    expect(console.error).toHaveBeenCalledTimes(1)
  })

  test('a field cannot replace the level or event', () => {
    ServerLog.info('real.event', { level: 'error', event: 'fake' })
    const [entry] = lines()
    expect(entry.level).toBe('info')
    expect(entry.event).toBe('real.event')
  })
})

describe('EffectLogger', () => {
  test('a failed operation is logged with its name and annotations, even when recovered', async () => {
    await Effect.runPromise(
      operation('links.insert', () => Promise.reject(new Error('UNIQUE constraint failed'))).pipe(
        Effect.orElseSucceed(() => null),
        Effect.annotateLogs({ procedure: 'links.create' }),
        Effect.provide(EffectLogger.layer),
      ),
    )
    const [entry] = lines()
    expect(entry.level).toBe('warn')
    expect(entry.event).toBe('operation.failed')
    expect(entry.operation).toBe('links.insert')
    expect(entry.procedure).toBe('links.create')
    expect(entry.reason).toBe('UNIQUE constraint failed')
  })
})
