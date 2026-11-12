# Effect (web API only)

Per [oRPC Effect integration](https://orpc.dev/docs/integrations/effect):

- Module-scoped `ManagedRuntime` with Workers `MixedScheduler('sync')`
- `Db` and per-request `WorkerRequest` on `effect/context`
- `effect/wrap` maps unexpected errors to `ORPCError`
- Procedures use `.effect`; migrate IO to `yield*` + services incrementally

Contracts stay ArkType-only in `@openlink/contracts`.
