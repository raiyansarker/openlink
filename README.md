# OpenLink

Turborepo monorepo for [OpenLink](https://github.com/) — a Cloudflare Workers link shortener.

## Stack

- **Package manager:** [Bun](https://bun.sh)
- **Monorepo:** [Turborepo](https://turborepo.dev)
- **App (`apps/web`):** [TanStack Start](https://tanstack.com/start) on [Cloudflare Workers](https://developers.cloudflare.com/workers/) — API + SSR in one Worker
- **Database:** [Drizzle ORM](https://orm.drizzle.team) on Cloudflare **D1** (local via Wrangler)
- **Contracts:** OpenAPI 3.1 YAML in `@openlink/contracts` → **oRPC v2** procedures (`@hey-api/openapi-ts` `orpc` plugin)
- **API runtime:** [`OpenAPIHandler`](https://orpc.dev/docs/openapi/openapi-handler) (`@orpc/openapi/fetch`) on `/api/v1/*`, TanStack catch-all route
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

### Regenerate API types after contract changes

```sh
cd packages/contracts && bun run build
```

## Worktrees

Use additional git worktrees from this repo when you want parallel backend/frontend workstreams; merge back into `main` when ready.
