import { describe, expect, test } from 'bun:test'
import { ArkTypeToJsonSchemaConverter } from '@orpc/arktype'
import { OpenAPIGenerator } from '@orpc/openapi'

import { contract } from './contract'

describe('OpenAPI export', () => {
  test('generates from the full contract without ArkType JSON Schema errors', async () => {
    const generator = new OpenAPIGenerator({
      converters: [new ArkTypeToJsonSchemaConverter()],
    })

    const spec = await generator.generate(contract, {
      base: {
        info: { title: 'OpenLink API', version: '0.0.0' },
        servers: [{ url: '/api/v1' }],
      },
    })

    expect(Object.keys(spec.paths ?? {}).length).toBeGreaterThan(0)
    expect(spec.paths?.['/openapi.json']).toBeDefined()
  })
})
