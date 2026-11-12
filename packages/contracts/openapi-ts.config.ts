import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  input: './openapi/openapi.yaml',
  output: 'generated/orpc',
  plugins: [
    {
      name: 'orpc',
      compatibilityVersion: 2,
      validator: 'zod',
    },
  ],
})
