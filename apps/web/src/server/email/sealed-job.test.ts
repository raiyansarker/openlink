import { describe, expect, test } from 'bun:test'
import type { EmailJob } from './job'
import { EmailJobSeal } from './sealed-job'

const SECRET = 'test-secret-that-is-at-least-32-characters-long'
const job: EmailJob = {
  to: 'ada@example.com',
  message: {
    template: 'password-reset',
    props: { name: 'Ada', resetUrl: 'https://app.example.com/reset-password/tok_123', expiresIn: '1 hour', baseUrl: 'https://app.example.com', logoUrl: 'https://app.example.com/logo192.png' },
  },
}

describe('EmailJobSeal', () => {
  test('round-trips a job and shows only the template name', async () => {
    const sealed = await EmailJobSeal.seal(SECRET, job)
    expect(sealed.template).toBe('password-reset')
    const visible = JSON.stringify(sealed)
    for (const secretPart of ['ada@example.com', 'tok_123', 'Ada"']) expect(visible).not.toContain(secretPart)
    expect(await EmailJobSeal.open(SECRET, sealed)).toEqual(job)
  })

  test('each seal is different, even for the same job', async () => {
    const [a, b] = await Promise.all([EmailJobSeal.seal(SECRET, job), EmailJobSeal.seal(SECRET, job)])
    expect(a.sealed).not.toBe(b.sealed)
  })

  test('a wrong secret or an altered job does not open', async () => {
    const sealed = await EmailJobSeal.seal(SECRET, job)
    expect(await EmailJobSeal.open('another-secret-that-is-at-least-32-chars', sealed)).toBeNull()
    const [version, iv, data] = sealed.sealed.split('.')
    const flipped = `${data.slice(0, -2)}${data.at(-2) === 'A' ? 'B' : 'A'}${data.at(-1)}`
    expect(await EmailJobSeal.open(SECRET, { ...sealed, sealed: `${version}.${iv}.${flipped}` })).toBeNull()
    expect(await EmailJobSeal.open(SECRET, { ...sealed, sealed: 'v0.x.y' })).toBeNull()
  })
})
