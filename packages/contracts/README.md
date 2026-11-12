# @openlink/contracts

HTTP API **contract-first** definitions for OpenLink using [oRPC](https://orpc.dev) OpenAPI routing and [ArkType](https://arktype.io) schemas.

## Layout

| Path | Purpose |
|------|---------|
| `src/models/` | Shared ArkType types (request/response bodies) |
| `src/procedures/*.ts` | One module per API area (`system`, `auth`, `organizations`, `domains`, `links`) |
| `src/contract.ts` | Nested router contract consumed by `implement(contract)` |

There is **no checked-in OpenAPI JSON**. The Worker serves `GET /api/v1/openapi.json` by running `OpenAPIGenerator` on this contract at request time (see `apps/web/src/server/orpc/router.ts`).

## Commands

```bash
bun run check-types
bun run test
bun run lint
```
