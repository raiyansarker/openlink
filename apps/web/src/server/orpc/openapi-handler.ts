import { OpenAPIHandler } from '@orpc/openapi/fetch'
import { mergeStandardHeaders } from '@standard-server/core'
import { createApiContext, type ApiContext } from './context'
import { router } from './router'

function withSetCookieHeaders(
  headers: Parameters<typeof mergeStandardHeaders>[0],
  setCookieHeaders: string[],
) {
  if (setCookieHeaders.length === 0) return headers

  const cookieHeader: string | string[] = setCookieHeaders
  return mergeStandardHeaders(headers, { 'set-cookie': cookieHeader })
}

export const openApiHandler = new OpenAPIHandler<ApiContext>(router, {
  routingInterceptors: [
    async (interceptorOptions) => {
      const result = await interceptorOptions.next(interceptorOptions)
      if (!result.matched || !result.response) return result

      const { context } = interceptorOptions
      if (context.setCookieHeaders.length === 0) return result

      return {
        matched: true as const,
        response: {
          ...result.response,
          headers: withSetCookieHeaders(
            result.response.headers,
            context.setCookieHeaders,
          ),
        },
      }
    },
  ],
})

export async function handleOpenApiRequest(request: Request) {
  return openApiHandler.handle(request, {
    prefix: '/api/v1',
    context: () => createApiContext(request),
  })
}
