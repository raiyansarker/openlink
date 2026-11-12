# @openlink/contracts

oRPC **2.0 beta** OpenAPI contracts with **ArkType** schemas (shareable with the frontend).

## Layout

Each API area: `schema.ts` (ArkType), `contract.ts` (`oc.meta(openapi(...))`), `index.ts`.

OpenAPI is served at runtime from the Worker (`GET /api/v1/openapi.json`).
