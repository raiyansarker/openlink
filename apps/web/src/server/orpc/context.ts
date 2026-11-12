export type ApiContext = {
  request: Request
  /** Raw Set-Cookie header values to attach to the API response (auth). */
  setCookieHeaders: string[]
}

export function createApiContext(request: Request): ApiContext {
  return {
    request,
    setCookieHeaders: [],
  }
}

export function mergeAuthResponseCookies(
  context: ApiContext,
  authResponse: Response,
) {
  if (typeof authResponse.headers.getSetCookie === 'function') {
    context.setCookieHeaders.push(...authResponse.headers.getSetCookie())
    return
  }
  const single = authResponse.headers.get('Set-Cookie')
  if (single) context.setCookieHeaders.push(single)
}
