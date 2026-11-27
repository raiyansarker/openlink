# OpenLink email catalog

This package contains email-safe React Email templates. The templates intentionally use their own primitives and inline styles instead of importing application UI components: email clients do not run the app’s component CSS or Astryx runtime.

## Templates

| Template                               | Backend flow                                | Status              |
| -------------------------------------- | ------------------------------------------- | ------------------- |
| `workspace-invite`                     | Organization member invite and resend       | Ready               |
| `welcome`                              | New account/workspace onboarding            | Ready               |
| `email-verification`                   | Better Auth email verification              | Ready               |
| `password-reset`                       | Better Auth password reset                  | Ready               |
| `security-alert`                       | New session, passkey, or suspicious sign-in | Ready               |
| API key created                        | API key lifecycle                           | Planned integration |
| API key revoked or rotated             | API key lifecycle                           | Planned integration |
| Domain verified or verification failed | Custom-domain verification                  | Planned integration |
| Weekly analytics digest                | Link analytics and click reporting          | Planned             |

## Local preview

```sh
bun run dev --filter=@openlink/email
```

The preview server runs on port `3001`. Build all templates with `bun run build --filter=@openlink/email`.

Each template accepts optional `baseUrl` and `logoUrl` props. `baseUrl` is used for shared footer links, while `logoUrl` defaults to `/logo192.png` for previews. When sending an email, pass the application URL and the absolute URL for the hosted PNG, for example `baseUrl="https://app.example.com"` and `logoUrl="https://app.example.com/logo192.png"`.

## Sending

`renderEmail(message)` turns an `EmailMessage` (`{ template, props }`) into a subject, HTML and plain text. The web app never sends inline: it starts a run of the `openlink-email` Cloudflare Workflow (`EmailWorkflow` in `apps/web/src/server/email/`), which renders the email and delivers it through Amazon SES in production (Mailtrap Local under `vite dev`), retrying transient failures. Every email is rate limited per recipient, per IP and app-wide before it is queued (`apps/web/src/server/email/limits.ts`).
