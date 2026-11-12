import { json } from '@tanstack/react-start'

export type ApiErrorCode =
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'internal_error'

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>,
) {
  return json(
    {
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status },
  )
}

export async function readJsonBody<T>(request: Request): Promise<T | Response> {
  try {
    return (await request.json()) as T
  } catch {
    return apiError(400, 'bad_request', 'Request body must be valid JSON')
  }
}
