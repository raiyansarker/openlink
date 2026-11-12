# @openlink/contracts

**oRPC OpenAPI contract** — the single source of truth for the HTTP API.

This package follows [oRPC contract-first](https://orpc.dev/docs/contract-first) with [OpenAPI routing](https://orpc.dev/docs/openapi/routing):

| File | Role |
|------|------|
| `src/schemas.ts` | Zod schemas (inputs/outputs) |
| `src/openapi-contract.ts` | Procedures built with `oc.route({ method, path, ... })` |
| `generated/openapi.json` | **Exported** OpenAPI document (generated, not hand-edited) |

The Worker implements this contract with `implement(contract)` and serves it via `OpenAPIHandler` (`@orpc/openapi/fetch`).

## Commands

```sh
bun run build    # regenerate generated/openapi.json from the contract
bun run test
bun run check-types
```

When you change the API, edit `src/openapi-contract.ts` and `src/schemas.ts` — not a separate OpenAPI YAML file.
