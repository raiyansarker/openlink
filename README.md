# OpenLink

Turborepo monorepo for [OpenLink](https://github.com/) — a Cloudflare Workers link shortener.

## Stack

- **Package manager:** [Bun](https://bun.sh)
- **Monorepo:** [Turborepo](https://turborepo.dev)
- **App (`apps/web`):** [TanStack Start](https://tanstack.com/start) on [Cloudflare Workers](https://developers.cloudflare.com/workers/) — API + SSR in one Worker
- **Database:** [Drizzle ORM](https://orm.drizzle.team) on Cloudflare **D1** (local via Wrangler)
- **Contracts:** [oRPC OpenAPI contract](https://orpc.dev/docs/openapi) in `@openlink/contracts` (`oc.route` + Zod) — **not** a hand-maintained OpenAPI YAML file
- **Spec export:** `OpenAPIGenerator` writes `generated/openapi.json` from the contract (`cd packages/contracts && bun run build`)
- **API runtime:** [`OpenAPIHandler`](https://orpc.dev/docs/openapi/openapi-handler) + `implement(contract)` in `apps/web`
- **Custom domains:** [@opencoredev/domain-sdk](https://domain-sdk.dev) — `memory` provider locally, `cloudflare` SaaS when configured
- **Auth:** Email + password today ([Better Auth](https://www.better-auth.com)); social / magic link later

## Repository layout

```
openlink/main.backend/   # backend worktree (`backend` branch)
├── apps/
│   └── web/             # TanStack Start Worker (implements the API)
└── packages/
    ├── contracts/       # OpenAPI spec + generated types
    ├── db/              # Drizzle schema + SQL migrations
    ├── domain/          # Domain SDK factory (memory | cloudflare)
    ├── eslint-config/
    └── typescript-config/
```

## Commands

From `openlink/main`:

```sh
bun install
bun run dev          # all apps (web on port 3000)
bun run build
bun run check-types
bun run lint
bun run test
```

Run only the web app:

```sh
bun run dev --filter=web
```

Deploy the web app (requires Cloudflare auth):

```sh
cd apps/web && bun run deploy
```

## Backend API (local only)

Contract document: `packages/contracts/openapi/openapi.yaml` (served at `/api/v1/openapi.json`). Interactive docs: `/api/docs` (Stoplight Elements).

### One-time local setup

```sh
bun install
cp apps/web/.dev.vars.example apps/web/.dev.vars   # edit BETTER_AUTH_SECRET
cd apps/web
bun run db:migrate:local
bun run db:seed:bootstrap-invite
cd ../packages/contracts && bun run build
```

Bootstrap org creation uses invite token `local-bootstrap-invite-token` (see seed SQL).

### Custom domains in development

`wrangler.jsonc` sets `DOMAIN_PROVIDER=memory`. Domains verify in-process with Domain SDK’s memory adapter—no Cloudflare API calls. For real SaaS hostnames, copy Cloudflare values into `.dev.vars` and set `DOMAIN_PROVIDER=cloudflare`.

### Tests (Bun)

```sh
bun run test
```

GitHub Actions runs `test`, `check-types`, and `lint` on pushes and pull requests (see `.github/workflows/ci.yml`).

### Change the API contract

Edit `packages/contracts/src/openapi-contract.ts` and `packages/contracts/src/schemas.ts`, then:

```sh
cd packages/contracts && bun run build   # refresh generated/openapi.json for /api/docs
```

## Worktrees

Use additional git worktrees from this repo when you want parallel backend/frontend workstreams; merge back into `main` when ready.
