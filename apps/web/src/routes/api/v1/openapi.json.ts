import { createFileRoute } from '@tanstack/react-router'
import openApiDocument from '@openlink/contracts/openapi.json'

export const Route = createFileRoute('/api/v1/openapi/json')({
  server: {
    handlers: {
      GET: () =>
        new Response(JSON.stringify(openApiDocument), {
          headers: {
            'content-type': 'application/json; charset=utf-8',
          },
        }),
    },
  },
})
