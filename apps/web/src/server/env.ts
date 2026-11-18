import { env } from 'cloudflare:workers'
import type { AnalyticsEngineDataset, D1Database } from '@cloudflare/workers-types'
import type { OpenLinkDomainEnv } from '@openlink/domain'

import type { EmailJob } from './email/job'

export type WorkerBindings = OpenLinkDomainEnv & {
  DB: D1Database
  ANALYTICS: AnalyticsEngineDataset
  /** Profile pictures and workspace logos (the runtime's own R2 type, as in the generated `Env`). */
  MEDIA: R2Bucket
  /** Caps password attempts on protected links (3 per minute per link and IP). */
  LINK_PASSWORD_LIMITER: RateLimit
  /** Outgoing email. The producer enqueues here and the same Worker's `queue` handler sends. */
  EMAIL_QUEUE?: Queue<EmailJob>
  /** Resend API key (a Worker secret). Not needed under `vite dev`, which prints emails instead. */
  RESEND_API_KEY?: string
  /** Sender, e.g. `OpenLink <no-reply@example.com>`. Set in `wrangler.jsonc`; the domain must be verified with Resend. */
  EMAIL_FROM?: string
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  /** Extra origins allowed to call the auth API (comma separated), e.g. previews. */
  BETTER_AUTH_TRUSTED_ORIGINS?: string
  /** Email and password sign-in is on unless this is `"false"`. */
  EMAIL_PASSWORD_SIGN_IN?: string
  /** OAuth providers switch on only when both the id and secret are set. */
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string
  /** When `"true"`, create-invite responses include the raw token (local dev only). */
  EXPOSE_INVITE_TOKENS_IN_API?: string
}

export function getBindings(): WorkerBindings {
  return env as WorkerBindings
}
