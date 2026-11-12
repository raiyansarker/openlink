import { describe, expect, test } from 'bun:test'
import { contract } from '@openlink/contracts'
import { ArkTypeToJsonSchemaConverter } from '@orpc/arktype'
import { OpenAPIGenerator } from '@orpc/openapi'

describe('web OpenAPI integration', () => {
  test('generates the same contract shape as @openlink/contracts', async () => {
    const generator = new OpenAPIGenerator({
      converters: [new ArkTypeToJsonSchemaConverter()],
    })

    const spec = await generator.generate(contract, {
      base: {
        info: { title: 'OpenLink API', version: '0.1.0' },
        servers: [{ url: '/api/v1' }],
      },
    })

    expect(spec.openapi).toMatch(/^3\./)
    expect(spec.paths?.['/health']?.get).toBeDefined()
    expect(spec.paths?.['/auth/session']?.get).toBeDefined()
  })
})
