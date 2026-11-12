import { OpenAPIHandler } from '@orpc/openapi/fetch'
import { createApiContext, type ApiContext } from './context'
import { router } from './router'

export const openApiHandler = new OpenAPIHandler<ApiContext>(router, {
  adapterInterceptors: [
    async ({ next, context }) => {
      const result = await next()
      if (!result.matched || !result.response) return result
      if (context.setCookieHeaders.length === 0) return result

      const headers = new Headers(result.response.headers)
      for (const cookie of context.setCookieHeaders) {
        headers.append('Set-Cookie', cookie)
      }

      return {
        matched: true,
        response: new Response(result.response.body, {
          status: result.response.status,
          statusText: result.response.statusText,
          headers,
        }),
      }
    },
  ],
})

export async function handleOpenApiRequest(request: Request) {
  return openApiHandler.handle(request, {
    prefix: '/api/v1',
    context: createApiContext(request),
  })
}
