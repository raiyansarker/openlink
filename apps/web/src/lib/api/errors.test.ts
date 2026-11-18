import { ORPCError } from '@orpc/client'
import { describe, expect, test } from 'bun:test'

import { apiErrorMessage, apiFailure, isRetryable } from './errors'
import { MAX_RETRIES, shouldRetry } from './query-client'

describe('apiFailure', () => {
  test('keeps the server message for client errors', () => {
    const error = apiFailure(new ORPCError('CONFLICT', { message: 'Slug already exists on this domain' }))
    expect(error).toMatchObject({ code: 'CONFLICT', status: 409, message: 'Slug already exists on this domain' })
  })

  test('never leaks internals for server errors', () => {
    const error = new ORPCError('INTERNAL_SERVER_ERROR', { message: 'SQLITE_ERROR: no such table user' })
    expect(apiFailure(error).message).not.toContain('SQLITE')
    expect(isRetryable(error)).toBe(true)
  })

  test('network failures and unknown values get friendly messages', () => {
    expect(apiFailure(new TypeError('fetch failed'))).toMatchObject({ code: 'NETWORK' })
    expect(isRetryable(new TypeError('fetch failed'))).toBe(true)
    expect(apiErrorMessage('weird', 'Custom fallback')).toBe('Custom fallback')
    expect(apiErrorMessage(new Error('Pick another name.'))).toBe('Pick another name.')
  })

  test('client errors are not retryable', () => {
    expect(apiFailure(new ORPCError('UNAUTHORIZED')).status).toBe(401)
    expect(isRetryable(new ORPCError('UNAUTHORIZED'))).toBe(false)
  })
})

describe('shouldRetry', () => {
  test('retries transient failures a bounded number of times, never client errors', () => {
    const network = new TypeError('x')
    expect(shouldRetry(0, network)).toBe(true)
    expect(shouldRetry(MAX_RETRIES, network)).toBe(false)
    expect(shouldRetry(0, new ORPCError('NOT_FOUND'))).toBe(false)
    expect(shouldRetry(0, new ORPCError('INTERNAL_SERVER_ERROR'))).toBe(true)
  })
})
