import { describe, expect, test } from 'bun:test'
import { type } from 'arktype'
import { firstError, requiredEmail, requiredText } from './fields'

const messages = (result: unknown) => (result instanceof type.errors ? result.map((e) => e.message) : [])

describe('form fields', () => {
  test('required rejects blank text', () => {
    const field = requiredText('Enter a name.')
    expect(messages(field('   '))).toEqual(['Enter a name.'])
    expect(messages(field('Ada'))).toEqual([])
  })

  test('email reports missing and invalid separately', () => {
    const field = requiredEmail({ required: 'Missing.', invalid: 'Invalid.' })
    expect(messages(field(' '))).toEqual(['Missing.'])
    expect(messages(field('nope'))).toEqual(['Invalid.'])
    expect(messages(field(' a@b.co '))).toEqual([])
  })

  test('firstError reads Standard Schema issues and strings', () => {
    expect(firstError([undefined, { message: 'Bad.' }])).toBe('Bad.')
    expect(firstError(['Oops'])).toBe('Oops')
    expect(firstError([])).toBeUndefined()
  })
})
