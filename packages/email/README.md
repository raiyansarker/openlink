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

The explicit demo previews are available at `/preview/demo-workspace-invite` and `/preview/demo-security-alert`.

Each template accepts an optional `logoUrl` prop. It defaults to `/logo192.png` for previews; when sending an email, pass the absolute URL for the PNG hosted by the web application, for example `https://app.example.com/logo192.png`.

## Integration note

The backend currently creates invite and authentication records but does not yet have a mail transport binding. The props on each template are deliberately transport-agnostic so they can be connected to Resend, Postmark, SES, or another provider without changing the markup.
