import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import openapiTS from 'openapi-typescript'
import { parse } from 'yaml'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const specPath = join(root, 'openapi', 'openapi.yaml')
const outDir = join(root, 'generated')

const raw = await readFile(specPath, 'utf8')
const document = parse(raw)

await mkdir(outDir, { recursive: true })
await writeFile(join(outDir, 'openapi.json'), JSON.stringify(document, null, 2))

const types = await openapiTS(document as never, {
  exportType: true,
  rootTypes: true,
})

await writeFile(
  join(outDir, 'types.ts'),
  `/* eslint-disable */\n/** Generated from openapi/openapi.yaml — do not edit by hand. */\n\n${types}`,
)

console.info('Wrote packages/contracts/generated/openapi.json and types.ts')
