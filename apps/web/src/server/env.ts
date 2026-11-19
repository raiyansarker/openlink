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
  /** Outgoing email. Callers start a run of this workflow (`EmailWorkflow`), which renders and sends. */
  EMAIL_WORKFLOW?: Workflow<EmailJob>
  /** Amazon SES credentials (Worker secrets) for production email. Not needed under `vite dev`, which sends to Mailtrap Local. */
  AWS_SES_ACCESS_KEY_ID?: string
  AWS_SES_SECRET_ACCESS_KEY?: string
  /** SES region, e.g. `us-east-1`. The sender identity must be verified there. */
  AWS_SES_REGION?: string
  /** Sender, e.g. `OpenLink <no-reply@example.com>`. Set in `wrangler.jsonc`; the address or domain must be verified in Amazon SES. */
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
