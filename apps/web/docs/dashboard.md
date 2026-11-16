# Dashboard (demo)

Three-column layout:

1. **Icon rail** — one glyph per organization (switch workspace).
2. **Nav column** — routes and actions for the active org.
3. **Detail column** — page content (overview, links, etc.).

Data lives in `src/data/demo/`. Styling: `src/styles/dashboard-three-column.css`.

URLs are org-scoped under `/w`: `/w/acme`, `/w/acme/links`, etc. Old `/dashboard/...` URLs redirect to `/w/...`.

Run: `bun run dev --filter=@openlink/web`.
