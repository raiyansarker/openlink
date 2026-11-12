import { describe, expect, test } from 'bun:test'
import { OpenAPIGenerator } from '@orpc/openapi'
import { experimental_ArkTypeToJsonSchemaConverter } from '@orpc/arktype'

import { contract } from './contract'

describe('OpenAPI export', () => {
  test('generates from the full contract without ArkType JSON Schema errors', async () => {
    const generator = new OpenAPIGenerator({
      schemaConverters: [new experimental_ArkTypeToJsonSchemaConverter()],
    })

    const spec = await generator.generate(contract, {
      info: { title: 'OpenLink API', version: '0.0.0' },
      servers: [{ url: '/api/v1' }],
    })

    expect(Object.keys(spec.paths ?? {}).length).toBeGreaterThan(0)
    expect(spec.paths?.['/openapi.json']).toBeDefined()
  })
})
