# OpenLink

Turborepo monorepo for [OpenLink](https://github.com/) — a Cloudflare Workers link shortener.

## Stack

- **Package manager:** [Bun](https://bun.sh)
- **Monorepo:** [Turborepo](https://turborepo.dev)
- **App (`apps/web`):** [TanStack Start](https://tanstack.com/start) on [Cloudflare Workers](https://developers.cloudflare.com/workers/)

## Repository layout

```
openlink/main/          # primary branch / main worktree (you add feature worktrees locally)
├── apps/
│   └── web/            # TanStack Start application
└── packages/
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
```

Run only the web app:

```sh
bun run dev --filter=web
```

Deploy the web app (requires Cloudflare auth):

```sh
cd apps/web && bun run deploy
```

## Worktrees

Use additional git worktrees from this repo when you want parallel backend/frontend workstreams; merge back into `main` when ready.
