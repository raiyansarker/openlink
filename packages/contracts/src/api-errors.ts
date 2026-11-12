import { HealthResponse } from './system/schema'

/** Shared API errors — augmented onto every procedure via `oc.errors(...).router(...)`. */
export const apiErrorMap = {
  UNAUTHORIZED: { message: 'Authentication required' },
  FORBIDDEN: { message: 'Insufficient permissions' },
  NOT_FOUND: { message: 'Resource not found' },
  BAD_REQUEST: { message: 'Bad request' },
  CONFLICT: { message: 'Conflict' },
  SERVICE_UNAVAILABLE: {
    message: 'One or more dependencies are unhealthy',
    data: HealthResponse,
  },
} as const
