import { COMMON_ERROR_STATUS_MAP, isDefinedError, ORPCError } from '@orpc/client'

export type ApiFailure = { code: string; status: number; message: string }

const FRIENDLY: Record<string, string> = {
  UNAUTHORIZED: 'Your session has expired. Sign in again.',
  FORBIDDEN: 'You do not have permission to do that.',
  NOT_FOUND: 'That no longer exists.',
  INTERNAL_SERVER_ERROR: 'Something went wrong on our side. Please try again.',
  SERVICE_UNAVAILABLE: 'The service is unavailable right now. Please try again.',
}

/** Anything thrown by the API client, reduced to a code, an HTTP status and a message safe to show. */
export function apiFailure(error: unknown, fallback = 'Something went wrong. Please try again.'): ApiFailure {
  if (error instanceof ORPCError || isDefinedError(error)) {
    const e = error as ORPCError<string, unknown>
    const status = (COMMON_ERROR_STATUS_MAP as Record<string, number>)[e.code] ?? 500
    const known = FRIENDLY[e.code]
    // Server messages for 4xx are written for people; 5xx never leak internals.
    const message = status >= 500 ? (known ?? fallback) : e.message || known || fallback
    return { code: e.code, status, message }
  }
  if (error instanceof TypeError) {
    return { code: 'NETWORK', status: 0, message: 'Could not reach the server. Check your connection.' }
  }
  if (error instanceof Error && error.message) return { code: 'UNKNOWN', status: 0, message: error.message }
  return { code: 'UNKNOWN', status: 0, message: fallback }
}

/** The message to show for a failed call. */
export function apiErrorMessage(error: unknown, fallback?: string): string {
  return apiFailure(error, fallback).message
}

/** Network failures and server errors may pass on a retry; client errors never do. */
export function isRetryable(error: unknown): boolean {
  const { status } = apiFailure(error)
  return status === 0 || status >= 500
}
