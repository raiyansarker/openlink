import { env } from 'cloudflare:workers'
import type { AnalyticsEngineDataset, D1Database } from '@cloudflare/workers-types'
import type { OpenLinkDomainEnv } from '@openlink/domain'

export type WorkerBindings = OpenLinkDomainEnv & {
  DB: D1Database
  ANALYTICS: AnalyticsEngineDataset
  /** Profile pictures and workspace logos (the runtime's own R2 type, as in the generated `Env`). */
  MEDIA: R2Bucket
  /** Caps password attempts on protected links (3 per minute per link and IP). */
  LINK_PASSWORD_LIMITER: RateLimit
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  /** Extra origins allowed to call the auth API (comma separated), e.g. previews. */
  BETTER_AUTH_TRUSTED_ORIGINS?: string
  BOOTSTRAP_ORG_INVITE_TOKEN?: string
  /** `"true"` re-enables email and password sign-in; off by default (Google and GitHub only). */
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
