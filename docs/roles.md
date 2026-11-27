# Workspace roles & permissions

OpenLink organizations have four member roles. This document is the canonical
reference for **what each role can do**: both what the API enforces on every
request and what the UI shows (or hides) for each role.

- **Owner** — full control, including destructive, workspace-level actions
- **Admin** — manages the workspace (settings, members, domains, API keys); cannot touch owners or other admins
- **Member** — creates and edits links and folders; read-only on workspace settings
- **Viewer** — read-only everywhere

Two kinds of callers share these rules:

- **Human sessions** (cookie via Better Auth) — the dashboard's signed-in users
- **API keys** (`Authorization: Bearer sk_…`) — machine callers that carry one
  org role themselves. They behave like a member of that rank, except they can
  never manage API keys and are never the owner.

The role enum lives in one place in the database
(`packages/db/src/schema/orgs.ts`) and is mirrored by the API contract. All
permission **logic** lives in one pure module:

| Consumer | File |
|---|---|
| Shared predicates (single source of truth) | `apps/web/src/lib/perms/permissions.ts` |
| Server re-export | `apps/web/src/server/org/permissions.ts` |
| UI hook | `apps/web/src/hooks/use-permissions.ts` |
| Client types (`Role`, `AssignableRole`) | `apps/web/src/lib/api/types.ts` |

## The matrix

Reads are allowed for every member — including viewers — unless noted. Roles
to the right of a ✅ inherit everything to their left in the same row.

### API truth (enforced per request)

| Capability | Viewer | Member | Admin | Owner | API key |
|---|---|---|---|---|---|
| Read links, folders, domains, analytics, activity, member list | ✅ | ✅ | ✅ | ✅ | ✅ (its org) |
| See IP addresses in activity / link history | — | — | ✅ | ✅ | per rank |
| Create / edit / delete links and folders | — | ✅ | ✅ | ✅ | ✅ member+ |
| Bulk move / delete / tag links; check framing | — | ✅ | ✅ | ✅ | ✅ member+ |
| Save link notes, hold pages, duplicates | — | ✅ | ✅ | ✅ | ✅ member+ |
| Add / verify / remove custom domains | — | — | ✅ | ✅ | ✅ admin+ |
| Rename workspace, change slug / logo | — | — | ✅ | ✅ | ✅ admin+ |
| Invite people, resend / revoke invites | — | — | ✅ | ✅ | ✅ admin+ |
| List pending invites | — | — | ✅ | ✅ | ✅ admin+ |
| Remove a member | self only | self only | ✅ member/viewer targets | ✅ any non-owner | per rank |
| Change a member's role | — | — | ✅ member↔viewer only | ✅ any non-owner role | per rank |
| Manage API keys (create / rotate / revoke) | — | — | ✅ **human only** | ✅ **human only** | never |
| Delete workspace, transfer ownership | — | — | — | ✅ | never |
| Personal endpoints (`/me`, devices, my invites) | ✅ | ✅ | ✅ | ✅ | rejected (401) |

Two deep rules the role names don't tell you:

- **Admins don't manage peers.** An admin can only change or remove members
  whose rank is `member` or `viewer`, and can only hand out `member`/`viewer`.
  Only owners may mint admins. (`canManageMember`, `assignableRoles`)
- **Owners are untouchable.** No one can edit or remove an owner through the
  member endpoints; ownership only moves through an explicit transfer, and
  deleting a workspace is owner-only.

### What the UI shows

The UI mirrors the matrix above so members never see controls that would only
bounce with an error at runtime. The general convention:

- **Hide** things a role can never do (viewers get no "Create link" button, no
  row menus, no domain write actions — and `C` / `F` shortcuts stay off).
- **Disable with an explanation** where capability discovery matters.
  Example: admins see "Transfer ownership" greyed out with text, because that
  is an owner-only action they should know exists.
- **Direct URLs never dead-end.** `/create/link`, `/edit/link` and
  `/domains/new` redirect unauthorized roles back to their list page;
  `/settings/integrations` and `/settings/api-keys` show an
  "owners and admins only" notice.

| UI surface | Viewer | Member | Admin | Owner |
|---|---|---|---|---|
| Dashboard, Activity, Links list, Link detail (read), Domains, Analytics, Members | visible | visible | visible | visible |
| Create link, import CSV, new folder, drag-drop, bulk writes | hidden | visible | visible | visible |
| Link detail: Edit, duplicate, hold, move, delete, notes editing | hidden | visible | visible | visible |
| Add / verify / remove domain | hidden | hidden | visible | visible |
| Members: invite, change-role, remove buttons | hidden | hidden | targets member/viewer only | all |
| Invite role picker | — | — | member / viewer | member / viewer / admin |
| Settings: General (name, slug, logo editing) | read-only | read-only | visible | visible |
| Settings: API keys page | hidden from nav (notice on direct URL) | hidden | visible | visible |
| Transfer ownership / delete workspace | hidden | hidden | disabled + text | visible |

Note the UI never *grants* anything: it only mirrors the API. A hidden button
is a UX guarantee, not a security boundary — the request guards below are.

## Where each rule comes from

Every API request passes the guard chain in
`apps/web/src/server/effect/access.ts`:

| Guard | Effect | Used for |
|---|---|---|
| `requirePrincipal` | auth (session or key) | everything; 401 when signed out / bad key |
| `requireOrgMemberEffect` | any member | all reads |
| `requireLinkWriterEffect` | `canManageLinks` | links & folders writes |
| `requireOrgAdminEffect` | `isAdmin` | domains, workspace settings, invites, member admin actions |
| `requireOrgAdminUserEffect` | admin human | API key management |
| `requireOrgOwnerEffect` | owner only | delete workspace, transfer ownership |

Failures return oRPC errors: `401 UNAUTHORIZED` for missing/invalid
credentials, `403 FORBIDDEN` for rank failures (with a human-readable message),
`404 NOT_FOUND` for resources in other orgs. The full role × endpoint matrix
is pinned by `apps/web/src/server/orpc/authorization.integration.ts`.

## Changing permissions

1. Add or change the logic in `apps/web/src/lib/perms/permissions.ts` —
   this file is the single source of truth for both server and UI.
2. Update the guard that uses it in `apps/web/src/server/effect/access.ts`
   and, for deep rules, the service-level checks (e.g. `org/members.ts`).
3. Update both test suites so they keep mirroring each other:
   - `apps/web/src/lib/perms/permissions.test.ts` (pure predicates)
   - `apps/web/src/server/org/permissions.test.ts` (server re-exports)
   - `apps/web/src/server/orpc/authorization.integration.ts` (HTTP matrix)
4. Gate new UI with `usePermissions()` (`apps/web/src/hooks/use-permissions.ts`)
   rather than inline role comparisons; pick hide or disable per the
   conventions above.
5. Update this document's matrix to match.

Adding a fifth role starts the same way — add it to `WORKSPACE_ROLES` in
`lib/perms/permissions.ts`. `usePermissions` deliberately assigns
`activeOrg.role` to `WorkspaceRole` without a cast, so a role added to the
database but not to the predicates **fails the type check** instead of
silently mis-ranking.
