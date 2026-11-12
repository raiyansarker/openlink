import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const spec = parse(readFileSync(join(root, 'openapi', 'openapi.yaml'), 'utf8')) as {
  paths: Record<string, unknown>
  components: { schemas: Record<string, unknown> }
}

describe('OpenAPI contract', () => {
  test('documents health with dependency schemas', () => {
    expect(spec.paths['/health']).toBeDefined()
    const health = spec.components.schemas.HealthResponse as { required: string[] }
    expect(health.required).toEqual(
      expect.arrayContaining(['status', 'service', 'checkedAt', 'checks']),
    )
  })

  test('lists core API surfaces', () => {
    expect(spec.paths['/auth/sign-in']).toBeDefined()
    expect(spec.paths['/organizations']).toBeDefined()
    expect(spec.paths['/organizations/{organizationId}/domains']).toBeDefined()
  })
})
