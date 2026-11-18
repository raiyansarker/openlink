import { describe, expect, test } from 'bun:test'
import { type } from 'arktype'
import { FormFields } from './fields'

const messages = (result: unknown) => (result instanceof type.errors ? result.map((e) => e.message) : [])

describe('FormFields', () => {
  test('required rejects blank text', () => {
    const field = FormFields.required('Enter a name.')
    expect(messages(field('   '))).toEqual(['Enter a name.'])
    expect(messages(field('Ada'))).toEqual([])
  })

  test('email reports missing and invalid separately', () => {
    const field = FormFields.email({ required: 'Missing.', invalid: 'Invalid.' })
    expect(messages(field(' '))).toEqual(['Missing.'])
    expect(messages(field('nope'))).toEqual(['Invalid.'])
    expect(messages(field(' a@b.co '))).toEqual([])
  })

  test('firstError reads Standard Schema issues and strings', () => {
    expect(FormFields.firstError([undefined, { message: 'Bad.' }])).toBe('Bad.')
    expect(FormFields.firstError(['Oops'])).toBe('Oops')
    expect(FormFields.firstError([])).toBeUndefined()
  })
})
