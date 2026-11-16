import { COMMON_ERROR_STATUS_MAP, isDefinedError, ORPCError } from '@orpc/client'

type Shape = { code: string; status: number; message: string }

/** Failures from the API, reduced to something safe to show a person. */
export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(shape: Shape) {
    super(shape.message)
    this.name = 'ApiError'
    this.code = shape.code
    this.status = shape.status
  }

  /** Normalise anything thrown by the client. */
  static from(error: unknown, fallback = 'Something went wrong. Please try again.'): ApiError {
    if (error instanceof ApiError) return error
    if (error instanceof ORPCError || isDefinedError(error)) {
      const e = error as ORPCError<string, unknown>
      const status = (COMMON_ERROR_STATUS_MAP as Record<string, number>)[e.code] ?? 500
      const known = ApiError.FRIENDLY[e.code]
      // Server messages for 4xx are written for people; 5xx never leak internals.
      const message = status >= 500 ? (known ?? fallback) : e.message || known || fallback
      return new ApiError({ code: e.code, status, message })
    }
    if (error instanceof TypeError) {
      return new ApiError({ code: 'NETWORK', status: 0, message: 'Could not reach the server. Check your connection.' })
    }
    return new ApiError({ code: 'UNKNOWN', status: 0, message: fallback })
  }

  /** The message to show for a thrown value. */
  static message(error: unknown, fallback?: string): string {
    return ApiError.from(error, fallback).message
  }

  get isUnauthorized() {
    return this.status === 401
  }

  /** Retrying cannot help with client errors. */
  get isRetryable() {
    return this.status === 0 || this.status >= 500
  }

  private static readonly FRIENDLY: Record<string, string> = {
    UNAUTHORIZED: 'Your session has expired. Sign in again.',
    FORBIDDEN: 'You do not have permission to do that.',
    NOT_FOUND: 'That no longer exists.',
    INTERNAL_SERVER_ERROR: 'Something went wrong on our side. Please try again.',
    SERVICE_UNAVAILABLE: 'The service is unavailable right now. Please try again.',
  }
}
