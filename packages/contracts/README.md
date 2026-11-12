# @openlink/contracts

oRPC **2.0 beta** OpenAPI contracts with **ArkType** schemas (shareable with the frontend).

## Layout

Each API area: `schema.ts` (ArkType), `contract.ts` (`oc.meta(openapi(...))`), `index.ts`.

OpenAPI is served at runtime from the Worker (`GET /api/v1/openapi.json`).

## Sharing with the frontend

Import schemas and types from this package only — no Effect dependency:

```ts
import { SignUpRequest } from '@openlink/contracts/auth'
import { Link } from '@openlink/contracts/links'
import { contract } from '@openlink/contracts'
```

ArkType `type` exports infer the same shapes the API validates. Wire the UI client with [OpenAPI Link](https://orpc.dev/docs/openapi/client) or your HTTP stack against `/api/v1/openapi.json`.
