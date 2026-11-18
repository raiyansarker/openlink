import { ORPCError } from '@orpc/server'

export function unauthorized(message = 'Authentication required') {
  return new ORPCError('UNAUTHORIZED', { message })
}

export function forbidden(message = 'Insufficient permissions') {
  return new ORPCError('FORBIDDEN', { message })
}

export function notFound(message = 'Resource not found') {
  return new ORPCError('NOT_FOUND', { message })
}

export function badRequest(message: string) {
  return new ORPCError('BAD_REQUEST', { message })
}

export function conflict(message: string) {
  return new ORPCError('CONFLICT', { message })
}

/** Typed error constructors from a procedure's `errors`, for helpers that map domain failures onto them. */
export type MessageError = (options: { message: string }) => Error
export type ErrorFactories = { NOT_FOUND: MessageError; FORBIDDEN: MessageError }
