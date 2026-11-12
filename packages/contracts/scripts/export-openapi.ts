/**
 * Export OpenAPI 3.x from the oRPC contract (not the other way around).
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { OpenAPIGenerator } from '@orpc/openapi'
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'
import { contract } from '../src/openapi-contract'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'generated')

const generator = new OpenAPIGenerator({
  schemaConverters: [new ZodToJsonSchemaConverter()],
})

const spec = await generator.generate(contract, {
  info: {
    title: 'OpenLink API',
    version: '0.1.0',
    description:
      'Generated from the oRPC OpenAPI contract in @openlink/contracts (packages/contracts/src).',
  },
  servers: [{ url: '/api/v1', description: 'Local and production Worker' }],
})

await mkdir(outDir, { recursive: true })
await writeFile(join(outDir, 'openapi.json'), JSON.stringify(spec, null, 2))
console.info('Wrote packages/contracts/generated/openapi.json from oRPC contract')
