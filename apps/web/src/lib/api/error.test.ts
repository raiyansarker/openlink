import { ORPCError } from '@orpc/client'
import { describe, expect, test } from 'bun:test'

import { ApiError } from './error'
import { AppQueryClient } from './query'

describe('ApiError.from', () => {
  test('keeps the server message for client errors', () => {
    const error = ApiError.from(new ORPCError('CONFLICT', { message: 'Slug already exists on this domain' }))
    expect(error).toMatchObject({ code: 'CONFLICT', status: 409, message: 'Slug already exists on this domain' })
  })

  test('never leaks internals for server errors', () => {
    const error = ApiError.from(new ORPCError('INTERNAL_SERVER_ERROR', { message: 'SQLITE_ERROR: no such table user' }))
    expect(error.message).not.toContain('SQLITE')
    expect(error.isRetryable).toBe(true)
  })

  test('network failures and unknown values get friendly messages', () => {
    expect(ApiError.from(new TypeError('fetch failed'))).toMatchObject({ code: 'NETWORK', isRetryable: true })
    expect(ApiError.message('weird', 'Custom fallback')).toBe('Custom fallback')
    const existing = new ApiError({ code: 'X', status: 400, message: 'm' })
    expect(ApiError.from(existing)).toBe(existing)
  })

  test('flags expired sessions and non-retryable client errors', () => {
    const unauthorized = ApiError.from(new ORPCError('UNAUTHORIZED'))
    expect(unauthorized.isUnauthorized).toBe(true)
    expect(unauthorized.isRetryable).toBe(false)
  })
})

describe('AppQueryClient.shouldRetry', () => {
  test('retries transient failures a bounded number of times, never client errors', () => {
    const network = new TypeError('x')
    expect(AppQueryClient.shouldRetry(0, network)).toBe(true)
    expect(AppQueryClient.shouldRetry(AppQueryClient.MAX_RETRIES, network)).toBe(false)
    expect(AppQueryClient.shouldRetry(0, new ORPCError('NOT_FOUND'))).toBe(false)
    expect(AppQueryClient.shouldRetry(0, new ORPCError('INTERNAL_SERVER_ERROR'))).toBe(true)
  })
})
