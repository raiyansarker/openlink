# @openlink/contracts

HTTP API **contract-first** definitions for OpenLink using [oRPC](https://orpc.dev) OpenAPI routing and [ArkType](https://arktype.io) schemas.

## Layout

Each API area is a folder with colocated `schema.ts` (ArkType types) and `contract.ts` (oRPC routes + local `contract` object):

```
src/
  auth/           schema.ts, contract.ts, index.ts
  system/
  organizations/
  domains/
  links/
  contract.ts     # root router: { system, auth, organizations, domains, links }
  index.ts
```

OpenAPI is **not** checked in. The Worker serves `GET /api/v1/openapi.json` via `OpenAPIGenerator` at runtime.

## Commands

```bash
bun run check-types
bun run test
bun run lint
```
