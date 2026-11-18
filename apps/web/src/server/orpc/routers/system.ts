import { contract } from '@openlink/contracts'
import { ArkTypeToJsonSchemaConverter } from '@orpc/arktype'
import { OpenAPIGenerator } from '@orpc/openapi'
import { Effect } from 'effect'

import { operation } from '#/server/effect/operations'
import { runHealthChecks } from '#/server/health/checks'

import { os } from './os'

const openApiGenerator = new OpenAPIGenerator({
  converters: [new ArkTypeToJsonSchemaConverter()],
})

export const systemRouter = {
  getHealth: os.system.getHealth.effect(function* ({ errors }) {
    const report = yield* runHealthChecks()
    if (report.status === 'error') {
      return yield* Effect.fail(errors.SERVICE_UNAVAILABLE({ data: report }))
    }
    return report
  }),

  getOpenApiDocument: os.system.getOpenApiDocument.effect(function* () {
    const document = yield* operation('system.generateOpenApi', () =>
      openApiGenerator.generate(contract, {
        base: {
          info: {
            title: 'OpenLink API',
            version: '0.1.0',
            description: 'OpenLink API — served via oRPC OpenAPI handler',
          },
          servers: [{ url: '/api/v1', description: 'Local and production Worker' }],
        },
      }),
    )
    return document as unknown as { [key: string]: unknown }
  }),
}
