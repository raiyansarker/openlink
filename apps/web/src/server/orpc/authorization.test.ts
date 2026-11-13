import { expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

test('OpenAPI handler authorization (isolated mock process)', async () => {
  // Bun module mocks are process-global; never import the fixture into this suite.
  const child = Bun.spawn(
    [process.execPath, 'test', fileURLToPath(new URL('./authorization.integration.ts', import.meta.url))],
    {
      cwd: fileURLToPath(new URL('../../../', import.meta.url)),
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 25_000,
    },
  )
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  expect(exitCode, `${stdout}\n${stderr}`).toBe(0)
}, 30_000)
